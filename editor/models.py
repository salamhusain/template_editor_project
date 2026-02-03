from django.db import models
from django.contrib.auth.models import User

class TemplateCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']
        verbose_name_plural = "Template Categories"


class Template(models.Model):
    name = models.CharField(max_length=200)
    image = models.ImageField(upload_to='templates/')
    category = models.ForeignKey(TemplateCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='templates')
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    is_admin_template = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['-created_at']


class UserDesign(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    template = models.ForeignKey(Template, on_delete=models.SET_NULL, null=True, blank=True)
    design_name = models.CharField(max_length=200)
    canvas_data = models.JSONField()
    preview_image = models.ImageField(upload_to='saved_designs/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - {self.design_name}"

    class Meta:
        ordering = ['-updated_at']


class UserUploadedImage(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    image = models.ImageField(upload_to='user_images/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.image.name}"

    class Meta:
        ordering = ['-uploaded_at']
