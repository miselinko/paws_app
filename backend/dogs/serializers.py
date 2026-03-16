from rest_framework import serializers
from .models import Dog


class DogSerializer(serializers.ModelSerializer):
    weight = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, default=0)

    class Meta:
        model = Dog
        fields = [
            'id', 'name', 'breed', 'age', 'weight',
            'size', 'gender', 'neutered',
            'temperament', 'notes', 'image', 'created_at'
        ]
        read_only_fields = ['created_at']
