from rest_framework import serializers
from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ['id', 'reservation', 'rating', 'comment', 'created_at']
        read_only_fields = ['owner', 'walker', 'created_at']

    def validate_reservation(self, reservation):
        user = self.context['request'].user
        if reservation.owner != user:
            raise serializers.ValidationError('You do not have permission to review this reservation.')
        if reservation.status != 'completed':
            raise serializers.ValidationError('Reviews can only be left for completed reservations.')
        if hasattr(reservation, 'review'):
            raise serializers.ValidationError('A review for this reservation already exists.')
        return reservation

    def create(self, validated_data):
        reservation = validated_data['reservation']
        return Review.objects.create(
            owner=self.context['request'].user,
            walker=reservation.walker,
            **validated_data
        )


class ReviewListSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source='owner.full_name', read_only=True)
    owner_image = serializers.ImageField(source='owner.profile_image', read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'owner_name', 'owner_image', 'rating', 'comment', 'created_at']
