from django.contrib import admin
from .models import Template, UserDesign, UserUploadedImage

@admin.register(Template)
class TemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_admin_template', 'uploaded_by', 'created_at']
    list_filter = ['is_admin_template', 'created_at']
    search_fields = ['name']
    
    def save_model(self, request, obj, form, change):
        if not obj.uploaded_by:
            obj.uploaded_by = request.user
        if request.user.is_staff or request.user.is_superuser:
            obj.is_admin_template = True
        super().save_model(request, obj, form, change)


@admin.register(UserDesign)
class UserDesignAdmin(admin.ModelAdmin):
    list_display = ['design_name', 'user', 'template', 'created_at', 'updated_at']
    list_filter = ['created_at', 'user']
    search_fields = ['design_name', 'user__username']


@admin.register(UserUploadedImage)
class UserUploadedImageAdmin(admin.ModelAdmin):
    list_display = ['user', 'image', 'uploaded_at']
    list_filter = ['uploaded_at']
    search_fields = ['user__username']
