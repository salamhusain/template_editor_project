from django.urls import path
from . import views

urlpatterns = [
    path('', views.template_list, name='template_list'),
    path('upload/', views.template_upload, name='template_upload'),
    path('editor/<int:template_id>/', views.editor_view, name='editor'),
    path('upload-image/', views.upload_user_image, name='upload_user_image'),
    path('save-design/', views.save_design, name='save_design'),
    path('my-designs/', views.my_designs, name='my_designs'),
    path('load-design/<int:design_id>/', views.load_design, name='load_design'),
    path('delete-design/<int:design_id>/', views.delete_design, name='delete_design'),
]
