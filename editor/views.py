from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from .models import Template, UserDesign, UserUploadedImage, TemplateCategory
from .forms import TemplateUploadForm, UserImageUploadForm
import json
import base64
from django.core.files.base import ContentFile

def template_list(request):
    """Display all available templates with category filter"""
    category_id = request.GET.get('category')
    
    # Get all categories that have templates
    categories = TemplateCategory.objects.filter(templates__isnull=False).distinct()
    
    # Filter templates
    if category_id:
        admin_templates = Template.objects.filter(is_admin_template=True, category_id=category_id)
        user_templates = Template.objects.filter(
            uploaded_by=request.user, 
            category_id=category_id
        ) if request.user.is_authenticated else []
        selected_category = get_object_or_404(TemplateCategory, id=category_id)
    else:
        admin_templates = Template.objects.filter(is_admin_template=True)
        user_templates = Template.objects.filter(
            uploaded_by=request.user
        ) if request.user.is_authenticated else []
        selected_category = None
    
    context = {
        'admin_templates': admin_templates,
        'user_templates': user_templates,
        'categories': categories,
        'selected_category': selected_category,
    }
    return render(request, 'editor/template_list.html', context)


@login_required
def template_upload(request):
    """Allow users to upload their own templates with categories"""
    if request.method == 'POST':
        form = TemplateUploadForm(request.POST, request.FILES)
        if form.is_valid():
            template = form.save(commit=False)
            template.uploaded_by = request.user
            template.is_admin_template = request.user.is_staff
            
            # Handle category
            custom_category = form.cleaned_data.get('custom_category')
            select_category = form.cleaned_data.get('select_category')
            
            if custom_category:
                # Create new category or get existing
                category, created = TemplateCategory.objects.get_or_create(
                    name=custom_category.strip(),
                    defaults={'created_by': request.user}
                )
                template.category = category
            elif select_category:
                template.category = select_category
            
            template.save()
            messages.success(request, 'Template uploaded successfully!')
            return redirect('template_list')
    else:
        form = TemplateUploadForm()
    
    return render(request, 'editor/template_upload.html', {'form': form})


@login_required
def editor_view(request, template_id):
    """Main editor view"""
    template = get_object_or_404(Template, id=template_id)
    user_images = UserUploadedImage.objects.filter(user=request.user)
    
    context = {
        'template': template,
        'user_images': user_images,
    }
    return render(request, 'editor/editor.html', context)


@login_required
def upload_user_image(request):
    """Handle user image uploads for use in editor"""
    if request.method == 'POST' and request.FILES.get('image'):
        image = request.FILES['image']
        user_image = UserUploadedImage.objects.create(
            user=request.user,
            image=image
        )
        return JsonResponse({
            'success': True,
            'image_url': user_image.image.url,
            'image_id': user_image.id
        })
    return JsonResponse({'success': False, 'error': 'No image provided'})


@login_required
def save_design(request):
    """Save user's canvas design"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            design_name = data.get('design_name')
            canvas_data = data.get('canvas_data')
            template_id = data.get('template_id')
            preview_image_data = data.get('preview_image')
            design_id = data.get('design_id')
            
            template = Template.objects.get(id=template_id)
            
            # Update existing or create new
            if design_id:
                design = UserDesign.objects.get(id=design_id, user=request.user)
                design.design_name = design_name
                design.canvas_data = canvas_data
            else:
                design = UserDesign(
                    user=request.user,
                    template=template,
                    design_name=design_name,
                    canvas_data=canvas_data
                )
            
            # Save preview image if provided
            if preview_image_data:
                format, imgstr = preview_image_data.split(';base64,')
                ext = format.split('/')[-1]
                data_file = ContentFile(base64.b64decode(imgstr), name=f'{design_name}.{ext}')
                design.preview_image = data_file
            
            design.save()
            
            return JsonResponse({
                'success': True,
                'design_id': design.id,
                'message': 'Design saved successfully!'
            })
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    
    return JsonResponse({'success': False, 'error': 'Invalid request'})


@login_required
def my_designs(request):
    """Display user's saved designs"""
    designs = UserDesign.objects.filter(
        user=request.user,
        template__isnull=False
    ).select_related('template')
    
    return render(request, 'editor/my_designs.html', {'designs': designs})


@login_required
def load_design(request, design_id):
    """Load a saved design for editing"""
    design = get_object_or_404(UserDesign, id=design_id, user=request.user)
    return JsonResponse({
        'success': True,
        'canvas_data': design.canvas_data,
        'design_name': design.design_name,
        'template_id': design.template.id if design.template else None
    })


@login_required
def delete_design(request, design_id):
    """Delete a saved design"""
    design = get_object_or_404(UserDesign, id=design_id, user=request.user)
    design.delete()
    messages.success(request, 'Design deleted successfully!')
    return redirect('my_designs')
