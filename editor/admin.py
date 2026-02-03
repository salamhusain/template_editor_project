from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from .models import Template, UserDesign, UserUploadedImage, TemplateCategory

# Customize Admin Site Headers
admin.site.site_header = "Forthicon Admin"
admin.site.site_title = "Forthicon Admin Portal"
admin.site.index_title = "Welcome to Forthicon Template Editor Administration"

# Unregister the default User admin
admin.site.unregister(User)

# Custom User Admin
@admin.register(User)
class CustomUserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'first_name', 'last_name', 'is_active', 'is_staff', 'date_joined', 'user_designs_count']
    list_filter = ['is_staff', 'is_superuser', 'is_active', 'date_joined']
    search_fields = ['username', 'first_name', 'last_name', 'email']
    ordering = ['-date_joined']
    
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email')}),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'is_staff', 'is_active'),
        }),
    )
    
    def user_designs_count(self, obj):
        count = obj.userdesign_set.count()
        return format_html('<strong style="color: #007bff;">{0}</strong>', count)
    user_designs_count.short_description = 'Designs'


@admin.register(TemplateCategory)
class TemplateCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_by', 'template_count', 'created_at']
    search_fields = ['name']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Category Information', {
            'fields': ('name', 'created_by')
        }),
        ('Timestamps', {
            'fields': ('created_at',),
        }),
    )
    
    def template_count(self, obj):
        count = obj.templates.count()
        return format_html('<span style="background: #17a2b8; color: white; padding: 4px 8px; border-radius: 4px;">{0}</span>', count)
    template_count.short_description = 'Templates'


@admin.register(Template)
class TemplateAdmin(admin.ModelAdmin):
    list_display = ['template_preview', 'name', 'category', 'uploaded_by', 'is_admin_template', 'created_at', 'used_count']
    list_filter = ['is_admin_template', 'category', 'created_at', 'uploaded_by']
    search_fields = ['name', 'uploaded_by__username', 'category__name']
    readonly_fields = ['created_at', 'updated_at', 'template_image_preview']
    
    fieldsets = (
        ('Template Information', {
            'fields': ('name', 'category', 'image', 'template_image_preview')
        }),
        ('Settings', {
            'fields': ('is_admin_template', 'uploaded_by')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not obj.uploaded_by:
            obj.uploaded_by = request.user
        if request.user.is_staff or request.user.is_superuser:
            obj.is_admin_template = True
        super().save_model(request, obj, form, change)
    
    def template_preview(self, obj):
        if obj.image:
            return format_html('<img src="{0}" width="60" height="60" style="object-fit: cover; border-radius: 8px;"/>', obj.image.url)
        return "No Image"
    template_preview.short_description = 'Preview'
    
    def template_image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{0}" style="max-width: 400px; max-height: 400px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"/>', obj.image.url)
        return "No Image"
    template_image_preview.short_description = 'Image Preview'
    
    def used_count(self, obj):
        count = obj.userdesign_set.count()
        return format_html('<span style="background: #28a745; color: white; padding: 4px 8px; border-radius: 4px;">{0}</span>', count)
    used_count.short_description = 'Times Used'


@admin.register(UserDesign)
class UserDesignAdmin(admin.ModelAdmin):
    list_display = ['design_preview', 'design_name', 'user', 'get_template_name', 'created_at', 'updated_at']
    list_filter = ['created_at', 'updated_at', 'user', 'template']
    search_fields = ['design_name', 'user__username', 'template__name']
    readonly_fields = ['created_at', 'updated_at', 'design_preview_large', 'canvas_data_preview']
    
    fieldsets = (
        ('Design Information', {
            'fields': ('design_name', 'user', 'template', 'design_preview_large')
        }),
        ('Canvas Data', {
            'fields': ('canvas_data_preview',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
        }),
    )
    
    def design_preview(self, obj):
        if obj.preview_image:
            return format_html('<img src="{0}" width="60" height="60" style="object-fit: cover; border-radius: 8px;"/>', obj.preview_image.url)
        return "No Preview"
    design_preview.short_description = 'Preview'
    
    def design_preview_large(self, obj):
        if obj.preview_image:
            return format_html('<img src="{0}" style="max-width: 600px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);"/>', obj.preview_image.url)
        return "No Preview Available"
    design_preview_large.short_description = 'Design Preview'
    
    def get_template_name(self, obj):
        """Safely handle template display with proper format_html usage"""
        if obj.template:
            return str(obj.template.name)
        return mark_safe('<span style="color: #dc3545; font-weight: 600;">⚠️ Template Deleted</span>')
    get_template_name.short_description = 'Template'
    
    def canvas_data_preview(self, obj):
        import json
        try:
            data = json.dumps(obj.canvas_data, indent=2)
            return format_html('<pre style="background: #f4f4f4; padding: 10px; border-radius: 5px; max-height: 400px; overflow: auto;">{0}</pre>', data)
        except Exception:
            return "Invalid JSON Data"
    canvas_data_preview.short_description = 'Canvas Data (JSON)'


@admin.register(UserUploadedImage)
class UserUploadedImageAdmin(admin.ModelAdmin):
    list_display = ['image_preview', 'user', 'image_name', 'uploaded_at', 'file_size']
    list_filter = ['uploaded_at', 'user']
    search_fields = ['user__username', 'image']
    readonly_fields = ['uploaded_at', 'image_preview_large']
    
    fieldsets = (
        ('Image Information', {
            'fields': ('user', 'image', 'image_preview_large')
        }),
        ('Timestamps', {
            'fields': ('uploaded_at',),
        }),
    )
    
    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{0}" width="60" height="60" style="object-fit: cover; border-radius: 8px;"/>', obj.image.url)
        return "No Image"
    image_preview.short_description = 'Preview'
    
    def image_preview_large(self, obj):
        if obj.image:
            return format_html('<img src="{0}" style="max-width: 400px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"/>', obj.image.url)
        return "No Image"
    image_preview_large.short_description = 'Image Preview'
    
    def image_name(self, obj):
        if obj.image:
            return obj.image.name.split('/')[-1]
        return "Unknown"
    image_name.short_description = 'File Name'
    
    def file_size(self, obj):
        if obj.image:
            try:
                size = obj.image.size
                if size < 1024:
                    return "{0} B".format(size)
                elif size < 1024 * 1024:
                    return "{0:.2f} KB".format(size / 1024)
                else:
                    return "{0:.2f} MB".format(size / (1024 * 1024))
            except Exception:
                return "Unknown"
        return "Unknown"
    file_size.short_description = 'Size'
