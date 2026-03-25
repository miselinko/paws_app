from rest_framework import serializers
from .models import Dog


class DogSerializer(serializers.ModelSerializer):
    weight = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, default=0)

    def validate_image(self, value):
        allowed = {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}
        if value.content_type not in allowed:
            raise serializers.ValidationError('Dozvoljeni formati: JPEG, PNG, WebP, GIF.')
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError('Slika ne sme biti veća od 5 MB.')
        return value

    class Meta:
        model = Dog
        fields = [
            'id', 'name', 'breed', 'age', 'weight',
            'size', 'gender', 'neutered',
            'temperament', 'notes', 'image', 'created_at'
        ]
        read_only_fields = ['created_at']
