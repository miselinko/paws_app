from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db.models import Count, Avg
from .models import WalkerProfile

User = get_user_model()


# ─── Admin serializers ──────────────────────────────────────────────

class AdminUserListSerializer(serializers.ModelSerializer):
    dogs_count = serializers.IntegerField(read_only=True)
    reservations_count = serializers.IntegerField(read_only=True)
    reviews_count = serializers.IntegerField(read_only=True)
    walker_profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'phone',
            'profile_image', 'role', 'address', 'is_active',
            'created_at', 'dogs_count', 'reservations_count',
            'reviews_count', 'walker_profile',
        ]

    def get_walker_profile(self, obj):
        if hasattr(obj, 'walker_profile'):
            try:
                wp = obj.walker_profile
                return {
                    'services': wp.services,
                    'hourly_rate': str(wp.hourly_rate),
                    'active': wp.active,
                    'is_featured': wp.is_featured,
                }
            except WalkerProfile.DoesNotExist:
                pass
        return None


class AdminUserDetailSerializer(serializers.ModelSerializer):
    walker_profile = serializers.SerializerMethodField()
    dogs = serializers.SerializerMethodField()
    recent_reservations = serializers.SerializerMethodField()
    stats = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'phone',
            'profile_image', 'role', 'address', 'lat', 'lng',
            'is_active', 'created_at',
            'walker_profile', 'dogs', 'recent_reservations', 'stats',
        ]

    def get_walker_profile(self, obj):
        if obj.role != 'walker':
            return None
        try:
            wp = obj.walker_profile
            reviews = obj.received_reviews.all()
            avg = round(sum(r.rating for r in reviews) / reviews.count(), 1) if reviews.exists() else 0
            return {
                'services': wp.services,
                'hourly_rate': str(wp.hourly_rate),
                'daily_rate': str(wp.daily_rate) if wp.daily_rate else None,
                'bio': wp.bio,
                'active': wp.active,
                'is_featured': wp.is_featured,
                'average_rating': avg,
                'review_count': reviews.count(),
            }
        except WalkerProfile.DoesNotExist:
            return None

    def get_dogs(self, obj):
        from dogs.models import Dog
        return list(
            Dog.objects.filter(owner=obj).values(
                'id', 'name', 'breed', 'age', 'size', 'image'
            )
        )

    def get_recent_reservations(self, obj):
        from reservations.models import Reservation
        qs = Reservation.objects.filter(
            **({'owner': obj} if obj.role == 'owner' else {'walker': obj})
        ).order_by('-created_at')[:10]
        return [
            {
                'id': r.id,
                'status': r.status,
                'service_type': r.service_type,
                'start_time': r.start_time.isoformat(),
                'other_user': (
                    f"{r.walker.first_name} {r.walker.last_name}"
                    if obj.role == 'owner'
                    else f"{r.owner.first_name} {r.owner.last_name}"
                ),
            }
            for r in qs.select_related('owner', 'walker')
        ]

    def get_stats(self, obj):
        from reservations.models import Reservation
        if obj.role == 'owner':
            qs = Reservation.objects.filter(owner=obj)
        else:
            qs = Reservation.objects.filter(walker=obj)
        return {
            'total_reservations': qs.count(),
            'completed': qs.filter(status='completed').count(),
            'cancelled': qs.filter(status='cancelled').count(),
            'pending': qs.filter(status='pending').count(),
        }


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True)
    services = serializers.ChoiceField(
        choices=['walking', 'boarding', 'both'],
        required=False,
        write_only=True,
    )

    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'phone', 'role', 'address', 'lat', 'lng', 'password', 'password2', 'services']

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        services = validated_data.pop('services', 'both')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        if user.role == User.WALKER:
            WalkerProfile.objects.create(user=user, services=services)
        return user


class WalkerProfileSerializer(serializers.ModelSerializer):
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    def get_average_rating(self, obj):
        reviews = obj.user.received_reviews.all()
        if not reviews.exists():
            return 0
        return round(sum(r.rating for r in reviews) / reviews.count(), 1)

    def get_review_count(self, obj):
        return obj.user.received_reviews.count()

    class Meta:
        model = WalkerProfile
        fields = ['hourly_rate', 'daily_rate', 'services', 'bio', 'active', 'is_featured', 'availability', 'average_rating', 'review_count']


class UserSerializer(serializers.ModelSerializer):
    walker_profile = WalkerProfileSerializer(read_only=True)
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'phone',
            'profile_image', 'role', 'address', 'lat', 'lng',
            'walker_profile', 'average_rating', 'review_count',
        ]
        read_only_fields = ['email', 'role']

    def get_average_rating(self, obj):
        reviews = obj.received_reviews.all()
        if not reviews.exists():
            return None
        return round(sum(r.rating for r in reviews) / reviews.count(), 1)

    def get_review_count(self, obj):
        return obj.received_reviews.count()


class OwnerInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'phone', 'email', 'address', 'lat', 'lng', 'profile_image']


class WalkerReservationInfoSerializer(serializers.ModelSerializer):
    walker_profile = WalkerProfileSerializer(read_only=True)
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'first_name', 'last_name', 'profile_image',
            'phone', 'email', 'address', 'walker_profile',
            'average_rating', 'review_count',
        ]

    def get_average_rating(self, obj):
        reviews = obj.received_reviews.all()
        if not reviews.exists():
            return None
        return round(sum(r.rating for r in reviews) / reviews.count(), 1)

    def get_review_count(self, obj):
        return obj.received_reviews.count()


class WalkerListSerializer(serializers.ModelSerializer):
    walker_profile = WalkerProfileSerializer(read_only=True)
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    distance = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'first_name', 'last_name', 'profile_image',
            'address', 'lat', 'lng', 'walker_profile', 'average_rating', 'review_count', 'distance',
        ]

    def get_average_rating(self, obj):
        reviews = obj.received_reviews.all()
        if not reviews.exists():
            return None
        return round(sum(r.rating for r in reviews) / reviews.count(), 1)

    def get_review_count(self, obj):
        return obj.received_reviews.count()

    def get_distance(self, obj):
        return getattr(obj, 'distance', None)
