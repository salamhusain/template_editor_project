from django import forms
from .models import Template, UserDesign, UserUploadedImage

class TemplateUploadForm(forms.ModelForm):
    class Meta:
        model = Template
        fields = ['name', 'image']
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Enter template name'
            }),
            'image': forms.FileInput(attrs={
                'class': 'form-control',
                'accept': 'image/*'
            })
        }


class UserImageUploadForm(forms.ModelForm):
    class Meta:
        model = UserUploadedImage
        fields = ['image']
        widgets = {
            'image': forms.FileInput(attrs={
                'class': 'form-control',
                'accept': 'image/*'
                # Removed 'multiple': True - not supported in Django FileInput
            })
        }


class DesignSaveForm(forms.ModelForm):
    class Meta:
        model = UserDesign
        fields = ['design_name']
        widgets = {
            'design_name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Enter design name'
            })
        }
