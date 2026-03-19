from rest_framework import serializers
from .models import Reservation
from dogs.serializers import DogSerializer
from users.serializers import WalkerListSerializer, WalkerReservationInfoSerializer, OwnerInfoSerializer
from django.contrib.auth import get_user_model

User = get_user_model()


class ReservationSerializer(serializers.ModelSerializer):
    dog_ids = serializers.PrimaryKeyRelatedField(
        many=True, write_only=True,
        queryset=__import__('dogs').models.Dog.objects.all(),
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
            'status', 'notes', 'cancelled_by', 'created_at', 'has_review'
        ]
        read_only_fields = ['status', 'cancelled_by', 'created_at', 'owner']

    def validate(self, data):
        if data['start_time'] >= data['end_time']:
            raise serializers.ValidationError('Start time must be before end time.')
        return data

    def create(self, validated_data):
        dogs = validated_data.pop('dogs')
        reservation = Reservation.objects.create(**validated_data)
        reservation.dogs.set(dogs)
        return reservation


class ReservationStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reservation
        fields = ['status']
