from django.contrib.auth.models import User
from .models import Template, UserDesign, UserUploadedImage

def admin_stats(request):
    """Add statistics to admin dashboard context"""
    if request.path.startswith('/admin/'):
        return {
            'user_count': User.objects.count(),
            'template_count': Template.objects.count(),
            'design_count': UserDesign.objects.count(),
            'image_count': UserUploadedImage.objects.count(),
        }
    return {}
