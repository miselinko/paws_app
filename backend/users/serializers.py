from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import WalkerProfile

User = get_user_model()


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
        fields = ['hourly_rate', 'daily_rate', 'services', 'bio', 'active', 'availability', 'average_rating', 'review_count']


class UserSerializer(serializers.ModelSerializer):
    walker_profile = WalkerProfileSerializer(read_only=True)
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'phone',
            'profile_image', 'role', 'address', 'lat', 'lng',
            'walker_profile', 'average_rating', 'review_count'
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
            'address', 'lat', 'lng', 'walker_profile', 'average_rating', 'review_count', 'distance'
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
