from django import forms
from .models import Template, UserDesign, UserUploadedImage, TemplateCategory

class TemplateUploadForm(forms.ModelForm):
    # Select from existing categories
    select_category = forms.ModelChoiceField(
        queryset=TemplateCategory.objects.all(),
        required=False,
        empty_label="-- Select Category --",
        widget=forms.Select(attrs={
            'class': 'form-select',
            'id': 'selectCategory'
        })
    )
    
    # Or create a new custom category
    custom_category = forms.CharField(
        required=False,
        max_length=100,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Or enter new category name',
            'id': 'customCategory'
        })
    )
    
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
    
    def clean(self):
        cleaned_data = super().clean()
        select_category = cleaned_data.get('select_category')
        custom_category = cleaned_data.get('custom_category')
        
        # If custom category is provided, it takes priority
        if custom_category:
            cleaned_data['category'] = custom_category
        elif select_category:
            cleaned_data['category'] = select_category
        
        return cleaned_data


class UserImageUploadForm(forms.ModelForm):
    class Meta:
        model = UserUploadedImage
        fields = ['image']
        widgets = {
            'image': forms.FileInput(attrs={
                'class': 'form-control',
                'accept': 'image/*'
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
