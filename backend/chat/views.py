from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.conf import settings
from django.utils import timezone
from datetime import date
from .models import Message
from .serializers import MessageSerializer, ConversationSerializer
from reservations.models import Reservation
from dogs.models import Dog
from groq import Groq
import json

User = get_user_model()

BOT_SYSTEM_PROMPT = """Ti si Paws Asistent 🐾 — pomoćnik na Paws platformi za šetanje i čuvanje pasa u Srbiji.
Današnji datum: {today}

Možeš da:
- Odgovaraš na pitanja o platformi
- Pronalaziš šetače za korisnika
- Kreiraš rezervacije u ime korisnika

Pravila rezervacije:
- Šetanje (walking) ili čuvanje (boarding)
- start_time mora biti pre end_time, oba isti dan (format: YYYY-MM-DDTHH:MM:00)
- Datum mora biti u budućnosti
- Potreban je bar jedan pas

Tok rezervacije:
1. Pitaj za tip usluge ako nije jasno
2. Pozovi get_walkers da dobiješ listu šetača
3. Pozovi get_my_dogs da dobiješ listu pasa korisnika
4. Predloži šetača i termin, potvrdi sa korisnikom
5. Pozovi create_reservation

Ako korisnik postavi pitanje koje nije vezano za pse, šetanje ili platformu — kratko i prijatno odgovori, pa na kraju dodaj novi paragraf sa sledećom rečenicom na novom redu:\n\nMožda ćeš voleti da znaš da Paws platforma nije samo za fudbal, već i za šetanje i čuvanje pasa! 🐾 Kako mogu pomoći u vezi sa tvojim psom?

Budi prijatan, koncizan, odgovaraj na srpskom. Kada pitaš za datum, koristi format DD.MM.YYYY."""

BOT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_walkers",
            "description": "Dobavi listu dostupnih šetača pasa na platformi",
            "parameters": {
                "type": "object",
                "properties": {
                    "service_type": {
                        "type": "string",
                        "enum": ["walking", "boarding"],
                        "description": "walking = šetanje, boarding = čuvanje"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_my_dogs",
            "description": "Dobavi listu pasa trenutnog korisnika",
            "parameters": {"type": "object", "properties": {}, "required": []}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_reservation",
            "description": "Kreiraj rezervaciju šetanja ili čuvanja psa",
            "parameters": {
                "type": "object",
                "properties": {
                    "walker_id": {"type": "string", "description": "ID šetača (broj)"},
                    "service_type": {"type": "string", "enum": ["walking", "boarding"]},
                    "start_time": {"type": "string", "description": "Početak: YYYY-MM-DDTHH:MM:00"},
                    "end_time": {"type": "string", "description": "Kraj: YYYY-MM-DDTHH:MM:00"},
                    "dog_ids": {"type": "string", "description": "ID-evi pasa odvojeni zarezom, npr: 1,2"},
                    "notes": {"type": "string", "description": "Napomene (opciono)"}
                },
                "required": ["walker_id", "service_type", "start_time", "end_time", "dog_ids"]
            }
        }
    }
]


def execute_tool(name, args, user):
    if name == "get_walkers":
        walkers = User.objects.filter(role=User.WALKER, walker_profile__active=True).select_related('walker_profile')
        svc = args.get('service_type')
        if svc:
            walkers = walkers.filter(
                Q(walker_profile__services=svc) | Q(walker_profile__services='both')
            )
        result = []
        for w in walkers[:10]:
            wp = w.walker_profile
            result.append({
                'id': w.id,
                'ime': f'{w.first_name} {w.last_name}',
                'usluge': wp.services,
                'cena_po_satu': str(wp.hourly_rate),
                'bio': wp.bio[:100] if wp.bio else '',
                'dostupnost': wp.availability,
            })
        return result

    elif name == "get_my_dogs":
        dogs = Dog.objects.filter(owner=user)
        return [{'id': d.id, 'ime': d.name, 'rasa': d.breed, 'godine': d.age} for d in dogs]

    elif name == "create_reservation":
        try:
            walker_id = int(args['walker_id'])
            walker = User.objects.get(pk=walker_id, role=User.WALKER)
            raw_dog_ids = args.get('dog_ids', '')
            if isinstance(raw_dog_ids, list):
                dog_ids = [int(d) for d in raw_dog_ids]
            elif isinstance(raw_dog_ids, str) and raw_dog_ids.startswith('['):
                dog_ids = [int(d) for d in json.loads(raw_dog_ids)]
            else:
                dog_ids = [int(d.strip()) for d in str(raw_dog_ids).split(',') if d.strip()]
            dogs = Dog.objects.filter(pk__in=dog_ids, owner=user)
            if not dogs.exists():
                return {'greska': 'Nisu pronađeni psi.'}
            reservation = Reservation.objects.create(
                owner=user,
                walker=walker,
                service_type=args['service_type'],
                start_time=args['start_time'],
                end_time=args['end_time'],
                notes=args.get('notes', ''),
                status=Reservation.PENDING,
            )
            reservation.dogs.set(dogs)
            return {'uspeh': True, 'rezervacija_id': reservation.id, 'status': 'na čekanju'}
        except Exception as e:
            return {'greska': str(e)}

    return {'greska': f'Nepoznat alat: {name}'}


class BotChatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        message = request.data.get('message', '').strip()
        history = request.data.get('history', [])
        if not message:
            return Response({'detail': 'Poruka ne može biti prazna.'}, status=400)

        client = Groq(api_key=settings.GROQ_API_KEY)

        today = date.today().strftime('%Y-%m-%d')
        system_prompt = BOT_SYSTEM_PROMPT.format(today=today)
        messages = [{'role': 'system', 'content': system_prompt}]
        for h in history[-14:]:
            if h.get('role') in ('user', 'assistant') and h.get('content'):
                messages.append({'role': h['role'], 'content': h['content']})
        messages.append({'role': 'user', 'content': message})

        # Agentic loop — max 5 iteracija
        for _ in range(5):
            try:
                completion = client.chat.completions.create(
                    model='meta-llama/llama-4-scout-17b-16e-instruct',
                    messages=messages,
                    tools=BOT_TOOLS,
                    tool_choice='auto',
                    max_tokens=1024,
                    temperature=0.6,
                )
            except Exception as e:
                return Response({'reply': f'Greška pri komunikaciji sa AI servisom: {e}'})

            msg = completion.choices[0].message

            if not msg.tool_calls:
                return Response({'reply': msg.content})

            # Izvrši tool calls
            messages.append(msg)
            for tc in msg.tool_calls:
                args = json.loads(tc.function.arguments)
                result = execute_tool(tc.function.name, args, request.user)
                messages.append({
                    'role': 'tool',
                    'tool_call_id': tc.id,
                    'content': json.dumps(result, ensure_ascii=False),
                })

        return Response({'reply': 'Nisam uspeo da završim zahtev. Pokušaj ponovo.'})

User = get_user_model()


class ConversationView(APIView):
    """GET messages with a user, POST send a message."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_id):
        try:
            other = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=404)

        messages = Message.objects.filter(
            Q(sender=request.user, recipient=other) |
            Q(sender=other, recipient=request.user)
        ).select_related('sender')

        # Mark incoming as read
        messages.filter(recipient=request.user, read=False).update(read=True)

        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)

    def post(self, request, user_id):
        try:
            recipient = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=404)

        text = request.data.get('text', '').strip()
        if not text:
            return Response({'detail': 'Message cannot be empty.'}, status=400)

        message = Message.objects.create(
            sender=request.user,
            recipient=recipient,
            text=text,
        )
        serializer = MessageSerializer(message)
        return Response(serializer.data, status=201)


class ConversationsListView(APIView):
    """List all conversations for current user."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        # All users this user has exchanged messages with
        sent = Message.objects.filter(sender=user).values_list('recipient_id', flat=True)
        received = Message.objects.filter(recipient=user).values_list('sender_id', flat=True)
        user_ids = set(list(sent) + list(received))

        result = []
        for uid in user_ids:
            try:
                other = User.objects.get(pk=uid)
            except User.DoesNotExist:
                continue

            messages = Message.objects.filter(
                Q(sender=user, recipient=other) |
                Q(sender=other, recipient=user)
            ).order_by('-created_at')

            if not messages.exists():
                continue

            last = messages.first()
            unread = messages.filter(recipient=user, read=False).count()

            result.append({
                'user': other,
                'last_message': last.text,
                'time': last.created_at,
                'unread': unread,
            })

        result.sort(key=lambda x: x['time'], reverse=True)
        serializer = ConversationSerializer(result, many=True)
        return Response(serializer.data)


class UnreadCountView(APIView):
    """Count of unread messages."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Message.objects.filter(recipient=request.user, read=False).count()
        return Response({'count': count})
