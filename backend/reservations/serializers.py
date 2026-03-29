from rest_framework import serializers
from .models import Reservation
from dogs.serializers import DogSerializer
from dogs.models import Dog
from users.serializers import WalkerReservationInfoSerializer, OwnerInfoSerializer
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

User = get_user_model()


class ReservationSerializer(serializers.ModelSerializer):
    dog_ids = serializers.PrimaryKeyRelatedField(
        many=True, write_only=True,
        queryset=Dog.objects.all(),
        source='dogs'
    )
    dogs = DogSerializer(many=True, read_only=True)
    walker_info = WalkerReservationInfoSerializer(source='walker', read_only=True)
    owner_info = OwnerInfoSerializer(source='owner', read_only=True)

    has_review = serializers.SerializerMethodField()

    def get_has_review(self, obj):
        return hasattr(obj, 'review')

    class Meta:
        model = Reservation
        fields = [
            'id', 'walker', 'walker_info', 'owner_info', 'dogs', 'dog_ids',
            'service_type', 'duration', 'start_time', 'end_time',
            'status', 'notes', 'cancelled_by', 'created_at', 'has_review',
            'last_lat', 'last_lng', 'walk_started_at',
        ]
        read_only_fields = ['status', 'cancelled_by', 'created_at', 'owner',
                            'last_lat', 'last_lng', 'walk_started_at']

    def validate(self, data):
        start = data['start_time']
        end = data['end_time']
        now = timezone.now()

        if start >= end:
            raise serializers.ValidationError('Početak mora biti pre kraja.')
        if start < now - timedelta(minutes=5):
            raise serializers.ValidationError('Početak ne može biti u prošlosti.')
        if start > now + timedelta(days=90):
            raise serializers.ValidationError('Rezervacija ne može biti više od 90 dana unapred.')
        if (end - start) < timedelta(minutes=15):
            raise serializers.ValidationError('Minimalno trajanje je 15 minuta.')

        duration = data.get('duration')
        if data.get('service_type') == 'walking' and duration and duration not in [30, 60, 90, 120, 180]:
            raise serializers.ValidationError('Trajanje šetnje mora biti 30, 60, 90, 120 ili 180 minuta.')

        return data

    def create(self, validated_data):
        dogs = validated_data.pop('dogs')
        reservation = Reservation.objects.create(**validated_data)
        reservation.dogs.set(dogs)
        return reservation


