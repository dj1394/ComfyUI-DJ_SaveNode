# -*- coding: utf-8 -*-
"""
DJSaveNode - ComfyUI节点收藏插件
可以通过拖拽将节点收藏到浏览器中
"""

from .nodes import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS
from .server import add_routes

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']

# Web目录
WEB_DIRECTORY = "./web"

# 版本信息
__version__ = "1.0.0"
__author__ = "DJ"
__description__ = "DJSaveNode - ComfyUI节点收藏插件"

print(f"[DJSaveNode] v{__version__} - {__description__}")
print(f"[DJSaveNode] 正在加载插件...")

# ComfyUI路由注册
try:
    from server import PromptServer
    
    @PromptServer.instance.routes.get('/djsavenode/api/favorites')
    async def get_favorites_route(request):
        from .server import dj_server
        return await dj_server.get_favorites(request)
    
    @PromptServer.instance.routes.post('/djsavenode/api/favorites')
    async def add_favorite_route(request):
        from .server import dj_server
        return await dj_server.add_favorite(request)
    
    @PromptServer.instance.routes.delete('/djsavenode/api/favorites')
    async def delete_favorite_route(request):
        from .server import dj_server
        return await dj_server.delete_favorite(request)
    
    @PromptServer.instance.routes.get('/djsavenode/api/categories')
    async def get_categories_route(request):
        from .server import dj_server
        return await dj_server.get_categories(request)
    
    @PromptServer.instance.routes.post('/djsavenode/api/categories')
    async def add_category_route(request):
        from .server import dj_server
        return await dj_server.add_category(request)
    
    @PromptServer.instance.routes.post('/djsavenode/api/favorites/rename')
    async def rename_favorite_route(request):
        from .server import dj_server
        return await dj_server.rename_favorite(request)
    
    @PromptServer.instance.routes.delete('/djsavenode/api/categories')
    async def delete_category_route(request):
        from .server import dj_server
        return await dj_server.delete_category(request)

    @PromptServer.instance.routes.post('/djsavenode/api/categories/rename')
    async def rename_category_route(request):
        from .server import dj_server
        return await dj_server.rename_category(request)

    @PromptServer.instance.routes.post('/djsavenode/api/favorites/move')
    async def move_favorite_route(request):
        from .server import dj_server
        return await dj_server.move_favorite(request)

    @PromptServer.instance.routes.post('/djsavenode/api/favorites/reorder')
    async def reorder_favorites_route(request):
        from .server import dj_server
        return await dj_server.reorder_favorites(request)

    print("[DJSaveNode] 路由注册成功")
except Exception as e:
    print(f"[DJSaveNode] 路由注册失败: {e}")
    
    # 备用方式
    def setup_routes(routes):
        """为ComfyUI设置路由"""
        try:
            add_routes(routes)
            print("[DJSaveNode] 路由注册成功（备用方式）")
        except Exception as e:
            print(f"[DJSaveNode] 路由注册失败: {e}")
    
    __all__.append('setup_routes')
