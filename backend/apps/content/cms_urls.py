from django.urls import path

from . import cms_views


urlpatterns = [
    path('staff/access/', cms_views.StaffCMSAccessView.as_view()),
    path("media/<uuid:media_id>/", cms_views.PublicCMSMediaAssetView.as_view(), name="cms-media-asset"),
    # Published public content.
    path("site/", cms_views.PublicCMSSiteView.as_view()),
    path("pages/resolve/", cms_views.PublicCMSPageResolveView.as_view()),
    path("pages/<slug:slug>/", cms_views.PublicCMSPageBySlugView.as_view()),
    path("pages/preview/<uuid:revision_id>/", cms_views.PublicCMSPagePreviewView.as_view()),
    path("articles/", cms_views.PublicCMSArticleListView.as_view()),
    path("articles/<slug:slug>/", cms_views.PublicCMSArticleDetailView.as_view()),
    path("categories/", cms_views.PublicCMSCategoryListView.as_view()),
    path("navigation/<slug:key>/", cms_views.PublicCMSNavigationView.as_view()),
    # Authenticated admin CMS workspace. There are intentionally no separate
    # author/reviewer/publisher permission tiers.
    path("staff/pages/", cms_views.StaffCMSPageListView.as_view()),
    path("staff/pages/<uuid:page_id>/", cms_views.StaffCMSPageDetailView.as_view()),
    path("staff/pages/<uuid:page_id>/drafts/", cms_views.StaffCMSPageDraftView.as_view()),
    path("staff/pages/<uuid:page_id>/revisions/<int:revision_number>/<slug:action>/", cms_views.StaffCMSPageRevisionActionView.as_view()),
    path("staff/pages/<uuid:page_id>/unpublish/", cms_views.StaffCMSPageUnpublishView.as_view()),
    path("staff/media/", cms_views.StaffCMSMediaListView.as_view()),
    path("staff/media/<uuid:media_id>/", cms_views.StaffCMSMediaDetailView.as_view()),
    path("staff/categories/", cms_views.StaffCMSCategoryListView.as_view()),
    path("staff/categories/<uuid:category_id>/", cms_views.StaffCMSCategoryDetailView.as_view()),
    path("staff/articles/", cms_views.StaffCMSArticleListView.as_view()),
    path("staff/articles/<uuid:article_id>/", cms_views.StaffCMSArticleDetailView.as_view()),
    path("staff/articles/<uuid:article_id>/drafts/", cms_views.StaffCMSArticleDraftView.as_view()),
    path("staff/articles/<uuid:article_id>/revisions/<int:revision_number>/publish/", cms_views.StaffCMSArticlePublishView.as_view()),
    path("staff/navigation/menus/", cms_views.StaffCMSNavigationListView.as_view()),
    path("staff/navigation/menus/<uuid:menu_id>/", cms_views.StaffCMSNavigationDetailView.as_view()),
    path("staff/navigation/menus/<uuid:menu_id>/drafts/", cms_views.StaffCMSNavigationDraftView.as_view()),
    path("staff/navigation/menus/<uuid:menu_id>/revisions/<int:revision_number>/publish/", cms_views.StaffCMSNavigationPublishView.as_view()),
    path("staff/settings/", cms_views.StaffCMSSiteSettingsView.as_view()),
    path("staff/settings/drafts/", cms_views.StaffCMSSiteSettingsDraftView.as_view()),
    path("staff/settings/revisions/<int:revision_number>/publish/", cms_views.StaffCMSSiteSettingsPublishView.as_view()),
]
