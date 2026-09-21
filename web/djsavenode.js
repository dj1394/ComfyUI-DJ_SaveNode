// djsavenode v1.0.0 - ComfyUI节点收藏插件

// 全局变量
let favoritesData = { categories: [], favorites: [] };
let currentCategory = '全部';
let app = null;  // ComfyUI app实例
let draggingFavId = null;  // 正在拖拽排序的收藏ID

// 获取ComfyUI app实例
function getComfyApp() {
    if (!app && window.app) {
        app = window.app;
    }
    return app;
}

// 创建悬浮按钮
function createButton() {
    // 检查按钮是否已存在
    if (document.querySelector('.djsavenode-btn')) {
        return;
    }
    
    // 创建按钮元素
    const button = document.createElement('button');
    button.className = 'djsavenode-btn';
    button.innerHTML = '🐷';
    button.title = 'djsavenode - 节点收藏';
    
    // 按钮样式 - 默认左下角（距左10px，距底250px）
    button.style.cssText = `
        position: fixed;
        bottom: 250px;
        left: 10px;
        width: 50px;
        height: 50px;
        background: linear-gradient(135deg, #ff6b9d 0%, #c06c84 100%);
        border: 2px solid #c06c84;
        border-radius: 50%;
        color: white;
        font-size: 24px;
        cursor: pointer;
        z-index: 9999;
        box-shadow: 0 4px 15px rgba(255, 107, 157, 0.4);
        transition: transform 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    // 悬停效果
    button.addEventListener('mouseenter', () => {
        button.style.transform = 'scale(1.1)';
    });
    
    button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1)';
    });
    
    // 拖拽功能
    let isDragging = false;
    let dragStartX, dragStartY;
    let buttonStartX, buttonStartY;
    let hasMoved = false;
    
    button.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        
        isDragging = true;
        hasMoved = false;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        
        const rect = button.getBoundingClientRect();
        buttonStartX = rect.left;
        buttonStartY = rect.top;
        
        button.style.cursor = 'grabbing';
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - dragStartX;
        const deltaY = e.clientY - dragStartY;
        
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
            hasMoved = true;
        }
        
        let newX = buttonStartX + deltaX;
        let newY = buttonStartY + deltaY;
        
        const maxX = window.innerWidth - button.offsetWidth;
        const maxY = window.innerHeight - button.offsetHeight;
        
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));
        
        button.style.left = newX + 'px';
        button.style.top = newY + 'px';
        button.style.right = 'auto';
        button.style.bottom = 'auto';
    });
    
    document.addEventListener('mouseup', (e) => {
        if (isDragging) {
            isDragging = false;
            button.style.cursor = 'pointer';
            
            if (!hasMoved) {
                toggleBrowser();
            }
        }
    });
    
    document.body.appendChild(button);
}

// 切换浏览器显示/隐藏
function toggleBrowser() {
    let browser = document.getElementById('djsavenode-browser');
    
    if (browser) {
        if (browser.style.display === 'none') {
            browser.style.display = 'flex';
            loadFavorites();
        } else {
            browser.style.display = 'none';
        }
    } else {
        createBrowser();
    }
}

// 创建浏览器窗口
function createBrowser() {
    // 顶天立地：宽度420px（原280加宽0.5倍），撑满整个窗口高度
    const width = 420;
    const height = window.innerHeight;
    const left = 70;  // 左侧70px，避开侧边栏
    const top = 0;

    const browser = document.createElement('div');
    browser.id = 'djsavenode-browser';

    browser.style.cssText = `
        position: fixed;
        left: ${left}px;
        top: ${top}px;
        width: ${width}px;
        height: ${height}px;
        background: #202c31;
        border: 1px solid #3a4a52;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
        z-index: 9998;
        display: flex;
        flex-direction: column;
        font-family: 'Segoe UI', Arial, sans-serif;
    `;
    
    browser.innerHTML = `
        <!-- 标题栏 -->
        <div id="dj-title-bar" style="
            background: #26343b;
            color: #d8e2e6;
            padding: 10px 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #3a4a52;
            cursor: move;
            user-select: none;
        ">
            <div style="font-size: 16px; font-weight: bold;">
                🐷 djsavenode - 节点收藏
            </div>
            <button id="dj-close-btn" style="
                background: rgba(255, 255, 255, 0.08);
                border: 1px solid rgba(255, 255, 255, 0.15);
                color: #d8e2e6;
                font-size: 18px;
                cursor: pointer;
                padding: 2px 8px;
                border-radius: 4px;
                transition: background 0.2s;
            " onmouseover="this.style.background='rgba(255,255,255,0.18)'" onmouseout="this.style.background='rgba(255,255,255,0.08)'">✕</button>
        </div>

        <!-- 工具栏 -->
        <div style="padding: 8px 12px; background: #1c262b; border-bottom: 1px solid #3a4a52;">
            <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 6px;">
                <select id="category-filter" style="padding: 5px 10px; background: #26343b; border: 1px solid #3a4a52; color: #d8e2e6; cursor: pointer; border-radius: 4px; font-size: 12px; flex: 1;">
                    <option value="全部">全部分类</option>
                </select>
                <button id="add-category-btn" title="新建分类" style="padding: 5px 9px; background: #3a4a52; border: 1px solid #4a5c66; color: #d8e2e6; cursor: pointer; border-radius: 4px; font-size: 12px;">➕</button>
                <button id="rename-category-btn" title="重命名当前分类" style="padding: 5px 9px; background: #3a4a52; border: 1px solid #4a5c66; color: #d8e2e6; cursor: pointer; border-radius: 4px; font-size: 12px;">✏️</button>
                <button id="delete-category-btn" title="删除当前分类" style="padding: 5px 9px; background: #5a3a3a; border: 1px solid #6a4a4a; color: #e6c8c8; cursor: pointer; border-radius: 4px; font-size: 12px;">🗑️</button>
            </div>
            <button id="save-selected-btn" style="width: 100%; padding: 7px; background: #3a4a52; border: 1px solid #4a5c66; color: #d8e2e6; cursor: pointer; border-radius: 4px; font-size: 13px; font-weight: bold;">
                ⭐ 收藏选中的节点/节点组
            </button>
            <div style="color: #7a8a92; font-size: 11px; margin-top: 5px; text-align: center;">
                选中多个节点可收藏为节点组（保持连接）
            </div>
        </div>

        <!-- 主内容区 -->
        <div style="flex: 1; display: flex; overflow: hidden;">
            <!-- 收藏列表 -->
            <div id="favorites-content" style="flex: 1; padding: 10px; overflow: auto; background: #202c31;">
                <div style="text-align: center; padding: 50px; color: #888;">
                    <div style="font-size: 48px; margin-bottom: 20px;">🐷</div>
                    <p style="color: #999;">暂无收藏节点</p>
                    <p style="color: #666; font-size: 12px; margin-top: 10px;">拖拽ComfyUI节点到此窗口即可收藏</p>
                </div>
            </div>
        </div>

        <!-- 状态栏 -->
        <div id="dj-status-bar" style="
            padding: 6px 15px;
            background: #1c262b;
            border-top: 1px solid #3a4a52;
            font-size: 12px;
            color: #8a9aa2;
        ">
            准备就绪
        </div>
    `;
    
    document.body.appendChild(browser);
    
    // 绑定事件
    document.getElementById('dj-close-btn').addEventListener('click', () => {
        browser.style.display = 'none';
    });
    
    document.getElementById('category-filter').addEventListener('change', (e) => {
        currentCategory = e.target.value;
        renderFavorites();
    });
    
    document.getElementById('add-category-btn').addEventListener('click', addCategory);

    document.getElementById('rename-category-btn').addEventListener('click', renameCategory);

    document.getElementById('delete-category-btn').addEventListener('click', deleteCategory);
    
    document.getElementById('save-selected-btn').addEventListener('click', saveSelectedNodes);
    
    // 添加窗口拖拽功能
    const titleBar = document.getElementById('dj-title-bar');
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    
    titleBar.addEventListener('mousedown', (e) => {
        // 如果点击的是关闭按钮，不触发拖拽
        if (e.target.id === 'dj-close-btn') return;
        
        isDragging = true;
        dragOffsetX = e.clientX - browser.offsetLeft;
        dragOffsetY = e.clientY - browser.offsetTop;
        titleBar.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const newLeft = e.clientX - dragOffsetX;
        const newTop = e.clientY - dragOffsetY;
        
        // 限制窗口不超出屏幕边界
        const maxLeft = window.innerWidth - browser.offsetWidth;
        const maxTop = window.innerHeight - browser.offsetHeight;
        
        browser.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
        browser.style.top = Math.max(0, Math.min(newTop, maxTop)) + 'px';
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            titleBar.style.cursor = 'move';
        }
    });
    
    // ESC键关闭
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const browser = document.getElementById('djsavenode-browser');
            if (browser && browser.style.display !== 'none') {
                browser.style.display = 'none';
            }
        }
    });
    
    // 初始化
    loadFavorites();
    
}

// 加载收藏列表
async function loadFavorites() {
    try {
        const response = await fetch('/djsavenode/api/favorites');
        const result = await response.json();
        
        if (result.success) {
            favoritesData = result.data;
            updateCategoryFilter();
            renderFavorites();
        }
    } catch (error) {
        console.error('[djsavenode] 加载收藏失败:', error);
    }
}

// 更新分类过滤器
function updateCategoryFilter() {
    const filter = document.getElementById('category-filter');
    if (!filter) return;
    
    const currentValue = filter.value;
    filter.innerHTML = '<option value="全部">全部分类</option>';
    
    favoritesData.categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        filter.appendChild(option);
    });
    
    filter.value = currentValue;
}

// 渲染收藏列表
function renderFavorites() {
    const content = document.getElementById('favorites-content');
    const statusBar = document.getElementById('dj-status-bar');
    
    if (!content) return;
    
    let favorites = favoritesData.favorites;
    
    // 过滤分类
    if (currentCategory !== '全部') {
        favorites = favorites.filter(f => f.category === currentCategory);
    }
    
    if (favorites.length === 0) {
        if (currentCategory !== '全部') {
            content.innerHTML = `
                <div style="text-align: center; padding: 50px; color: #888;">
                    <div style="font-size: 48px; margin-bottom: 20px;">🔍</div>
                    <p style="color: #999;">该分类下暂无收藏</p>
                    <p style="color: #666; font-size: 12px; margin-top: 10px;">请尝试调整筛选条件</p>
                </div>
            `;
            statusBar.textContent = '';
        } else {
            content.innerHTML = `
                <div style="text-align: center; padding: 50px; color: #888;">
                    <div style="font-size: 48px; margin-bottom: 20px;">🐷</div>
                    <p style="color: #999;">暂无收藏节点</p>
                    <p style="color: #666; font-size: 12px; margin-top: 10px;">拖拽ComfyUI节点到此窗口即可收藏</p>
                </div>
            `;
            statusBar.textContent = '';
        }
        return;
    }
    
    // 按分类分组
    const grouped = {};
    favorites.forEach(fav => {
        const cat = fav.category || '默认分类';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(fav);
    });
    
    content.innerHTML = Object.keys(grouped).map(category => `
        <div style="margin-bottom: 12px;">
            <div style="font-size: 13px; font-weight: bold; color: #9fc0cf; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #3a4a52;">
                📁 ${category}
            </div>
            <div class="favorites-sortable" data-category="${category}" style="
                display: flex;
                flex-direction: column;
                gap: 4px;
                min-height: 40px;
                padding: 3px;
                border: 2px dashed transparent;
                border-radius: 6px;
                transition: border-color 0.2s;
            ">
                ${grouped[category].map(fav => {
                    const isGroup = fav.isGroup || false;
                    const nodeCount = fav.nodeCount || (isGroup ? (fav.nodes ? fav.nodes.length : 0) : 1);
                    const icon = isGroup ? '🔗' : '📦';
                    const badge = isGroup ? `<span style="background: rgba(159, 192, 207, 0.15); color: #9fc0cf; font-size: 10px; padding: 1px 5px; border-radius: 8px; margin-left: 6px;">${nodeCount}个节点</span>` : '';

                    // 节点组与单节点：同色系，节点组略亮
                    const bgColor = isGroup ? '#2a3a42' : '#26343b';
                    const hoverBgColor = isGroup ? '#35474f' : '#30414a';
                    const titleColor = isGroup ? '#cfe4ec' : '#d8e2e6';

                    return `
                    <div class="favorite-item ${isGroup ? 'group-item' : 'single-item'}" data-id="${fav.id}" draggable="true" style="
                        padding: 5px 7px;
                        background: ${bgColor};
                        border: none;
                        border-radius: 5px;
                        cursor: default;
                        transition: all 0.2s;
                        position: relative;
                    " data-node='${JSON.stringify(fav).replace(/'/g, "&#39;")}'>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div class="fav-title" style="font-size: 13px; font-weight: bold; color: ${titleColor}; flex: 1; cursor: default; display: flex; align-items: center; overflow: hidden; white-space: nowrap;" title="双击重命名">
                                <span style="color: #6a7a82; margin-right: 6px; font-size: 12px;">☰</span>
                                <span style="margin-right: 6px;">${icon}</span>
                                <span style="overflow: hidden; text-overflow: ellipsis;">${fav.title || fav.type || '未知节点'}</span>
                                ${badge}
                            </div>
                            <div style="display: flex; gap: 4px; flex-shrink: 0;">
                                <button class="rename-fav-btn" data-id="${fav.id}" data-title="${(fav.title || fav.type || '').replace(/"/g, '&quot;')}" style="
                                    background: rgba(159, 192, 207, 0.1);
                                    border: 1px solid rgba(159, 192, 207, 0.25);
                                    color: #9fc0cf;
                                    font-size: 12px;
                                    cursor: pointer;
                                    padding: 1px 5px;
                                    border-radius: 3px;
                                    transition: all 0.2s;
                                " onmouseover="this.style.background='rgba(159, 192, 207, 0.25)'" onmouseout="this.style.background='rgba(159, 192, 207, 0.1)'">✏️</button>
                                <button class="delete-fav-btn" data-id="${fav.id}" style="
                                    background: rgba(255, 0, 0, 0.15);
                                    border: 1px solid rgba(255, 0, 0, 0.25);
                                    color: #e8a0a0;
                                    font-size: 12px;
                                    cursor: pointer;
                                    padding: 1px 5px;
                                    border-radius: 3px;
                                    transition: all 0.2s;
                                " onmouseover="this.style.background='rgba(255, 0, 0, 0.35)'" onmouseout="this.style.background='rgba(255, 0, 0, 0.15)'">🗑️</button>
                            </div>
                        </div>
                    </div>
                `;
                }).join('')}
            </div>
        </div>
    `).join('');
    
    // 绑定事件
    content.querySelectorAll('.favorite-item').forEach(item => {
        const isGroup = item.classList.contains('group-item');
        const originalBg = isGroup ? '#2a3a42' : '#26343b';
        const hoverBg = isGroup ? '#35474f' : '#30414a';

        item.addEventListener('mouseenter', function() {
            this.style.background = hoverBg;
        });
        item.addEventListener('mouseleave', function() {
            this.style.background = originalBg;
        });

        // 单击添加到画布
        item.addEventListener('click', function(e) {
            // 如果点击的是按钮，不触发
            if (e.target.tagName === 'BUTTON') return;

            const nodeData = JSON.parse(this.dataset.node.replace(/&#39;/g, "'"));
            addNodeToCanvas(nodeData);
        });

        // 拖拽开始：同时支持「放回画布」和「列表内排序」
        item.addEventListener('dragstart', function(e) {
            const nodeData = JSON.parse(this.dataset.node.replace(/&#39;/g, "'"));
            e.dataTransfer.setData('application/json', JSON.stringify(nodeData));
            e.dataTransfer.setData('text/plain', 'djsavenode-fav:' + this.dataset.id);
            e.dataTransfer.effectAllowed = 'copyMove';
            draggingFavId = this.dataset.id;
            this.style.opacity = '0.5';
            document.body.style.cursor = 'grabbing';
        });

        // 拖拽结束
        item.addEventListener('dragend', function(e) {
            this.style.opacity = '1';
            draggingFavId = null;
            document.body.style.cursor = '';
            removeDropIndicator();
        });

        // 右键菜单：移动到已有分类 / 删除
        item.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showFavContextMenu(e.clientX, e.clientY, this.dataset.id);
        });
    });

    // 列表内拖拽排序（仅同分类，跨分类请右键移动）
    content.querySelectorAll('.favorites-sortable').forEach(container => {
        container.addEventListener('dragover', function(e) {
            if (!draggingFavId) return;
            const draggingItem = content.querySelector(`.favorite-item[data-id="${draggingFavId}"]`);
            if (!draggingItem || draggingItem.parentElement !== this) return; // 跨分类不允许拖
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            // 计算插入位置
            const afterElement = getDragAfterElement(this, e.clientY);
            removeDropIndicator();
            const indicator = document.createElement('div');
            indicator.className = 'dj-drop-indicator';
            indicator.style.cssText = 'height:3px;background:#ff6b9d;border-radius:2px;margin:2px 0;box-shadow:0 0 6px rgba(255,107,157,0.8);';
            if (afterElement) {
                this.insertBefore(indicator, afterElement);
            } else {
                this.appendChild(indicator);
            }
        });

        container.addEventListener('drop', async function(e) {
            if (!draggingFavId) return;
            const draggingItem = content.querySelector(`.favorite-item[data-id="${draggingFavId}"]`);
            if (!draggingItem || draggingItem.parentElement !== this) return; // 跨分类不允许拖
            e.preventDefault();
            e.stopPropagation();

            const afterElement = getDragAfterElement(this, e.clientY);
            removeDropIndicator();

            // 计算新顺序（仅本分类内）
            const items = Array.from(this.querySelectorAll('.favorite-item'));
            items.splice(items.indexOf(draggingItem), 1);
            if (afterElement) {
                this.insertBefore(draggingItem, afterElement);
            } else {
                this.appendChild(draggingItem);
            }

            // 组装全局顺序：本分类按新顺序，其他分类保持原相对顺序
            const newOrder = [];
            content.querySelectorAll('.favorites-sortable').forEach(c => {
                c.querySelectorAll('.favorite-item').forEach(i => newOrder.push(i.dataset.id));
            });

            await saveReorder(newOrder);
        });

        container.addEventListener('dragleave', function(e) {
            if (!this.contains(e.relatedTarget)) {
                removeDropIndicator();
            }
        });
    });
    
    // 绑定重命名按钮
    content.querySelectorAll('.rename-fav-btn').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            const currentTitle = this.dataset.title;
            const newTitle = prompt('请输入新名称:', currentTitle);
            
            if (newTitle !== null && newTitle.trim() !== '' && newTitle !== currentTitle) {
                await renameFavorite(id, newTitle.trim());
            }
        });
    });
    
    // 绑定删除按钮
    content.querySelectorAll('.delete-fav-btn').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            if (confirm('确定要删除这个收藏吗?')) {
                await deleteFavorite(id);
            }
        });
    });
    
    // 更新状态栏
    let statusText = '';
    statusText += `共 ${favorites.length} 个收藏`;
    if (currentCategory !== '全部') {
        statusText += ` (${currentCategory})`;
    }
    statusBar.textContent = statusText;
}

// 计算拖拽插入位置
function getDragAfterElement(container, y) {
    const items = Array.from(container.querySelectorAll('.favorite-item:not([style*="opacity: 0.5"])'));
    let closest = { offset: -Infinity, element: null };

    for (const item of items) {
        const box = item.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            closest = { offset: offset, element: item };
        }
    }

    return closest.element;
}

// 移除拖拽插入指示线
function removeDropIndicator() {
    document.querySelectorAll('.dj-drop-indicator').forEach(el => el.remove());
}

// 保存排序
async function saveReorder(order) {
    try {
        const response = await fetch('/djsavenode/api/favorites/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order: order })
        });

        const result = await response.json();
        if (result.success) {
            await loadFavorites();
        } else {
            showNotification('❌ 排序保存失败', 'error');
            await loadFavorites();
        }
    } catch (error) {
        console.error('[DJSaveNode] 保存排序失败:', error);
        showNotification('❌ 排序保存失败', 'error');
        await loadFavorites();
    }
}

// 移动收藏到指定分类
async function moveFavoriteToCategory(id, category) {
    try {
        const response = await fetch('/djsavenode/api/favorites/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, category: category })
        });

        const result = await response.json();
        if (result.success) {
            await loadFavorites();
            showNotification(`✅ 已移动到「${category}」`, 'success');
        } else {
            showNotification('❌ 移动失败: ' + (result.error || ''), 'error');
        }
    } catch (error) {
        console.error('[DJSaveNode] 移动收藏失败:', error);
        showNotification('❌ 移动失败', 'error');
    }
}

// 收藏项右键菜单
function showFavContextMenu(x, y, favId) {
    // 移除已存在的菜单
    removeFavContextMenu();

    const menu = document.createElement('div');
    menu.id = 'dj-fav-context-menu';
    menu.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        background: #2a2a2a;
        border: 1px solid #444;
        border-radius: 6px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.5);
        z-index: 10005;
        min-width: 140px;
        padding: 4px 0;
        font-family: 'Segoe UI', Arial, sans-serif;
    `;

    const fav = favoritesData.favorites.find(f => f.id === favId);
    const currentCat = fav ? (fav.category || '默认分类') : '';

    // 标题
    const titleEl = document.createElement('div');
    titleEl.textContent = '移动到分组';
    titleEl.style.cssText = 'padding: 4px 12px;font-size:11px;color:#888;';
    menu.appendChild(titleEl);

    // 分类列表
    favoritesData.categories.forEach(cat => {
        const item = document.createElement('div');
        item.textContent = (cat === currentCat ? '✓ ' : '📁 ') + cat;
        item.style.cssText = `padding: 6px 12px;font-size:12px;color:${cat === currentCat ? '#ff6b9d' : '#e0e0e0'};cursor:pointer;white-space:nowrap;`;
        item.addEventListener('click', () => {
            if (cat !== currentCat) {
                moveFavoriteToCategory(favId, cat);
            }
            removeFavContextMenu();
        });
        item.addEventListener('mouseenter', () => { item.style.background = '#3a3a3a'; });
        item.addEventListener('mouseleave', () => { item.style.background = 'transparent'; });
        menu.appendChild(item);
    });

    // 分隔线 + 删除
    const sep = document.createElement('div');
    sep.style.cssText = 'height:1px;background:#444;margin:4px 0;';
    menu.appendChild(sep);

    const delItem = document.createElement('div');
    delItem.textContent = '🗑️ 删除收藏';
    delItem.style.cssText = 'padding: 6px 12px;font-size:12px;color:#ff6b6b;cursor:pointer;white-space:nowrap;';
    delItem.addEventListener('click', () => {
        removeFavContextMenu();
        if (confirm('确定要删除这个收藏吗?')) {
            deleteFavorite(favId);
        }
    });
    delItem.addEventListener('mouseenter', () => { delItem.style.background = '#3a3a3a'; });
    delItem.addEventListener('mouseleave', () => { delItem.style.background = 'transparent'; });
    menu.appendChild(delItem);

    document.body.appendChild(menu);

    // 限制菜单不超出屏幕
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        menu.style.left = (window.innerWidth - rect.width - 5) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
        menu.style.top = (y - rect.height) + 'px';
    }

    // 点击其他位置关闭
    setTimeout(() => {
        document.addEventListener('click', removeFavContextMenu, { once: true });
    }, 0);
}

// 移除收藏项右键菜单
function removeFavContextMenu() {
    const menu = document.getElementById('dj-fav-context-menu');
    if (menu) menu.remove();
}

// 重命名收藏
async function renameFavorite(id, newTitle) {
    try {
        const response = await fetch('/djsavenode/api/favorites/rename', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, title: newTitle })
        });
        
        const result = await response.json();
        
        if (result.success) {
            await loadFavorites();
            showNotification('✅ 重命名成功', 'success');
        } else {
            showNotification('❌ 重命名失败', 'error');
        }
    } catch (error) {
        console.error('[djsavenode] 重命名失败:', error);
        showNotification('❌ 重命名失败', 'error');
    }
}

// 删除收藏
async function deleteFavorite(id) {
    try {
        const response = await fetch(`/djsavenode/api/favorites?id=${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            await loadFavorites();
            showNotification('✅ 删除成功', 'success');
        }
    } catch (error) {
        console.error('[djsavenode] 删除失败:', error);
        showNotification('❌ 删除失败', 'error');
    }
}

// 添加分类
async function addCategory() {
    const name = prompt('请输入新分类名称:');
    if (!name || !name.trim()) return;
    
    try {
        const response = await fetch('/djsavenode/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.trim() })
        });
        
        const result = await response.json();
        
        if (result.success) {
            await loadFavorites();
            showNotification('✅ 分类创建成功', 'success');
        }
    } catch (error) {
        console.error('[djsavenode] 创建分类失败:', error);
        showNotification('❌ 创建失败', 'error');
    }
}

// 删除分类
async function deleteCategory() {
    if (currentCategory === '全部') {
        showNotification('⚠️ 请先选择要删除的分类', 'warning');
        return;
    }

    if (currentCategory === '默认分类') {
        showNotification('❌ 默认分类不能删除', 'error');
        return;
    }

    const confirmDelete = confirm(`确定要删除分类"${currentCategory}"吗？\n该分类下的所有收藏将移动到"默认分类"`);
    if (!confirmDelete) return;

    try {
        const response = await fetch(`/djsavenode/api/categories?name=${encodeURIComponent(currentCategory)}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            currentCategory = '全部';
            await loadFavorites();
            showNotification('✅ 分类删除成功', 'success');
        } else {
            showNotification('❌ 删除失败: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('[djsavenode] 删除分类失败:', error);
        showNotification('❌ 删除失败', 'error');
    }
}

// 重命名分类
async function renameCategory() {
    if (currentCategory === '全部') {
        showNotification('⚠️ 请先选择要重命名的分类', 'warning');
        return;
    }

    if (currentCategory === '默认分类') {
        showNotification('❌ 默认分类不能重命名', 'error');
        return;
    }

    const newName = prompt(`重命名分类 "${currentCategory}"\n\n请输入新名称:`, currentCategory);

    if (newName === null) {
        return; // 用户取消
    }

    if (!newName.trim()) {
        showNotification('❌ 分类名称不能为空', 'error');
        return;
    }

    if (newName.trim() === currentCategory) {
        return; // 名称没有变化
    }

    try {
        const response = await fetch('/djsavenode/api/categories/rename', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                oldName: currentCategory,
                newName: newName.trim()
            })
        });

        const result = await response.json();

        if (result.success) {
            const oldName = currentCategory;
            currentCategory = newName.trim();
            await loadFavorites();
            showNotification(`✅ 分类 "${oldName}" 已重命名为 "${currentCategory}"`, 'success');
        } else {
            showNotification('❌ 重命名失败: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('[djsavenode] 重命名分类失败:', error);
        showNotification('❌ 重命名失败', 'error');
    }
}

// 添加节点到画布
function addNodeToCanvas(nodeData) {
    
    const app = getComfyApp();
    if (!app || !app.graph) {
        showNotification('❌ ComfyUI未就绪', 'error');
        return;
    }
    
    try {
        // 如果是节点组，使用不同的恢复逻辑
        if (nodeData.isGroup && nodeData.nodes && nodeData.nodes.length > 0) {
            addNodeGroupToCanvas(nodeData);
            return;
        }
        
        // 单个节点的恢复逻辑
        // 获取画布中心位置
        const canvas = app.canvas;
        const canvasCenter = canvas.ds && canvas.ds.visible_area;

        // 计算节点放置位置（画布中心）
        const x = canvasCenter ? (canvasCenter[0] + canvasCenter[2]) / 2 : 100;
        const y = canvasCenter ? (canvasCenter[1] + canvasCenter[3]) / 2 : 100;
        
        // 创建节点
        const node = LiteGraph.createNode(nodeData.type);
        
        if (!node) {
            showNotification(`❌ 无法创建节点: ${nodeData.type}`, 'error');
            return;
        }
        
        // 设置节点位置
        node.pos = [x - 100, y - 50]; // 稍微偏移使其居中
        
        // 如果有保存的尺寸，恢复它
        if (nodeData.size) {
            node.size = nodeData.size;
        }
        
        // 恢复widget值
        if (nodeData.widgets && node.widgets) {
            nodeData.widgets.forEach((savedWidget, index) => {
                if (node.widgets[index] && savedWidget.value !== undefined) {
                    node.widgets[index].value = savedWidget.value;
                }
            });
        }
        
        // 添加到图形
        app.graph.add(node);
        
        // 选中新创建的节点
        canvas.selectNode(node);
        
        // 居中显示节点
        canvas.centerOnNode(node);
        
        showNotification(`✅ 已添加节点: ${nodeData.title}`, 'success');
        
        
    } catch (error) {
        console.error('[djsavenode] 添加节点失败:', error);
        showNotification('❌ 添加节点失败', 'error');
    }
}

// 添加节点组到画布
function addNodeGroupToCanvas(groupData) {
    const app = getComfyApp();
    if (!app || !app.graph || !app.canvas) {
        showNotification('❌ ComfyUI未就绪', 'error');
        return;
    }
    
    try {
        const canvas = app.canvas;
        const canvasCenter = canvas.ds && canvas.ds.visible_area;

        // 计算节点组放置位置（画布中心）
        const centerX = canvasCenter ? (canvasCenter[0] + canvasCenter[2]) / 2 : 100;
        const centerY = canvasCenter ? (canvasCenter[1] + canvasCenter[3]) / 2 : 100;
        
        // 计算节点组的边界框
        let minX = Infinity, minY = Infinity;
        groupData.nodes.forEach(nd => {
            const relPos = nd.relativePos || nd.pos || [0, 0];
            if (relPos[0] < minX) minX = relPos[0];
            if (relPos[1] < minY) minY = relPos[1];
        });
        
        // 创建所有节点
        const createdNodes = [];
        groupData.nodes.forEach((nodeData, index) => {
            const node = LiteGraph.createNode(nodeData.type);
            
            if (!node) {
                console.error(`[djsavenode] 无法创建节点: ${nodeData.type}`);
                return;
            }
            
            // 计算节点位置（相对于组中心）
            const relPos = nodeData.relativePos || nodeData.pos || [0, 0];
            const offsetX = relPos[0] - minX;
            const offsetY = relPos[1] - minY;
            
            node.pos = [centerX + offsetX - 200, centerY + offsetY - 100];
            
            // 恢复尺寸
            if (nodeData.size) {
                node.size = nodeData.size;
            }
            
            // 恢复widget值
            if (nodeData.widgets && node.widgets) {
                nodeData.widgets.forEach((savedWidget, widgetIndex) => {
                    if (node.widgets[widgetIndex] && savedWidget.value !== undefined) {
                        node.widgets[widgetIndex].value = savedWidget.value;
                    }
                });
            }
            
            // 恢复属性
            if (nodeData.properties) {
                Object.assign(node.properties || {}, nodeData.properties);
            }
            
            // 添加到图形
            app.graph.add(node);
            createdNodes.push(node);
        });
        
        // 重建连接
        if (groupData.connections && createdNodes.length > 0) {
            groupData.connections.forEach(conn => {
                const fromNode = createdNodes[conn.from_node_index];
                const toNode = createdNodes[conn.to_node_index];
                
                if (fromNode && toNode && 
                    fromNode.outputs && fromNode.outputs[conn.from_slot] &&
                    toNode.inputs && toNode.inputs[conn.to_slot]) {
                    
                    // 创建连接
                    fromNode.connect(conn.from_slot, toNode, conn.to_slot);
                }
            });
        }
        
        // 选中所有创建的节点
        canvas.selectNode(createdNodes[0]);
        createdNodes.forEach(node => {
            canvas.selectNode(node, true); // true表示添加到选择
        });
        
        // 居中显示节点组
        if (createdNodes.length > 0) {
            canvas.centerOnNode(createdNodes[0]);
        }
        
        showNotification(`✅ 已添加节点组: ${groupData.title} (${createdNodes.length}个节点)`, 'success');
        
    } catch (error) {
        console.error('[djsavenode] 添加节点组失败:', error);
        showNotification('❌ 添加节点组失败', 'error');
    }
}

// 显示通知
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #2a2a2a;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.3);
        z-index: 10003;
        border-left: 4px solid ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196f3'} ;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
    }
    @keyframes slideOut {
        from { transform: translateX(0); }
        to { transform: translateX(100%); }
    }
`;
document.head.appendChild(style);

// 获取当前选中的节点
function getSelectedNodes() {
    const app = getComfyApp();
    if (!app || !app.canvas) {
        return [];
    }
    
    const selected = app.canvas.selected_nodes || {};
    const nodes = [];
    
    for (let nodeId in selected) {
        const node = app.graph.getNodeById(parseInt(nodeId));
        if (node) {
            nodes.push(node);
        }
    }
    
    return nodes;
}

// 获取节点之间的连接关系
function getNodeConnections(nodes) {
    const app = getComfyApp();
    if (!app || !app.graph) {
        return [];
    }
    
    const connections = [];
    const nodeIds = new Set(nodes.map(n => n.id));
    
    nodes.forEach(node => {
        // 获取节点的输出连接
        if (node.outputs) {
            node.outputs.forEach((output, outputIndex) => {
                if (output.links) {
                    output.links.forEach(linkId => {
                        const link = app.graph.links[linkId];
                        if (link && nodeIds.has(link.target_id)) {
                            // 这是一个内部连接
                            connections.push({
                                from_node_id: node.id,
                                from_slot: outputIndex,
                                to_node_id: link.target_id,
                                to_slot: link.target_slot
                            });
                        }
                    });
                }
            });
        }
    });
    
    return connections;
}

// 收藏选中的节点
async function saveSelectedNodes() {
    const nodes = getSelectedNodes();
    
    if (nodes.length === 0) {
        showNotification('⚠️ 请先选中要收藏的节点', 'warning');
        return;
    }
    
    try {
        // 如果只有一个节点，按原来的方式保存（单个节点）
        if (nodes.length === 1) {
            const node = nodes[0];
            
            // 获取节点的实际显示名称
            let displayTitle = node.title;
            
            // 如果没有title，尝试从ComfyUI的节点定义获取
            if (!displayTitle && window.LiteGraph && window.LiteGraph.registered_node_types) {
                const nodeClass = window.LiteGraph.registered_node_types[node.type];
                if (nodeClass && nodeClass.title) {
                    displayTitle = nodeClass.title;
                }
            }
            
            // 如果还是没有，尝试其他属性
            if (!displayTitle) {
                displayTitle = node.properties?.title || 
                             node.properties?.["Node name for S&R"] ||
                             node.name ||
                             node.comfyClass ||
                             node.type;
            }
            
            const nodeData = {
                type: node.type,
                title: displayTitle,
                description: displayTitle !== node.type ? `${node.type}` : `${node.type} 节点`,
                properties: node.properties || {},
                size: node.size,
                widgets: node.widgets ? node.widgets.map(w => ({
                    name: w.name,
                    type: w.type,
                    value: w.value
                })) : []
            };
            
            const response = await fetch('/djsavenode/api/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    node: nodeData,
                    category: currentCategory === '全部' ? '默认分类' : currentCategory
                })
            });
            
            const result = await response.json();
            if (result.success) {
                await loadFavorites();
                showNotification(`✅ 成功收藏节点!`, 'success');
            } else {
                showNotification('❌ 收藏失败', 'error');
            }
        } else {
            // 多个节点，保存为节点组
            const app = getComfyApp();
            if (!app || !app.graph) {
                showNotification('❌ ComfyUI未就绪', 'error');
                return;
            }
            
            // 获取节点之间的连接关系
            const connections = getNodeConnections(nodes);
            
            // 保存所有节点的数据
            const nodesData = nodes.map(node => {
                // 获取节点的实际显示名称
                let displayTitle = node.title;
                
                if (!displayTitle && window.LiteGraph && window.LiteGraph.registered_node_types) {
                    const nodeClass = window.LiteGraph.registered_node_types[node.type];
                    if (nodeClass && nodeClass.title) {
                        displayTitle = nodeClass.title;
                    }
                }
                
                if (!displayTitle) {
                    displayTitle = node.properties?.title || 
                                 node.properties?.["Node name for S&R"] ||
                                 node.name ||
                                 node.comfyClass ||
                                 node.type;
                }
                
                return {
                    id: node.id, // 保存原始ID用于连接关系
                    type: node.type,
                    title: displayTitle,
                    description: displayTitle !== node.type ? `${node.type}` : `${node.type} 节点`,
                    properties: node.properties || {},
                    size: node.size,
                    pos: node.pos ? [node.pos[0], node.pos[1]] : [0, 0], // 保存位置
                    widgets: node.widgets ? node.widgets.map(w => ({
                        name: w.name,
                        type: w.type,
                        value: w.value
                    })) : []
                };
            });
            
            // 计算节点组的边界框，用于计算相对位置
            let minX = Infinity, minY = Infinity;
            nodesData.forEach(nd => {
                if (nd.pos[0] < minX) minX = nd.pos[0];
                if (nd.pos[1] < minY) minY = nd.pos[1];
            });
            
            // 转换为相对位置（相对于左上角）
            nodesData.forEach(nd => {
                nd.relativePos = [nd.pos[0] - minX, nd.pos[1] - minY];
            });
            
            // 创建节点组数据
            const groupTitle = prompt(`收藏节点组 (${nodes.length}个节点)\n\n请输入节点组名称:`, `节点组 (${nodes.length}个节点)`);
            if (groupTitle === null) {
                return; // 用户取消
            }
            
            const groupData = {
                isGroup: true, // 标记为节点组
                title: groupTitle.trim() || `节点组 (${nodes.length}个节点)`,
                description: `包含 ${nodes.length} 个已连接的节点`,
                nodes: nodesData,
                connections: connections.map(conn => ({
                    from_node_index: nodesData.findIndex(n => n.id === conn.from_node_id),
                    from_slot: conn.from_slot,
                    to_node_index: nodesData.findIndex(n => n.id === conn.to_node_id),
                    to_slot: conn.to_slot
                })), // 使用索引而不是ID，因为恢复时会创建新节点
                nodeCount: nodes.length
            };
            
            const response = await fetch('/djsavenode/api/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    node: groupData,
                    category: currentCategory === '全部' ? '默认分类' : currentCategory
                })
            });
            
            const result = await response.json();
            if (result.success) {
                await loadFavorites();
                showNotification(`✅ 成功收藏节点组 (${nodes.length}个节点)!`, 'success');
            } else {
                showNotification('❌ 收藏失败: ' + (result.error || ''), 'error');
            }
        }
    } catch (error) {
        console.error('[djsavenode] 保存节点失败:', error);
        showNotification('❌ 收藏失败', 'error');
    }
}

// 注册右键菜单
function registerContextMenu() {
    const app = getComfyApp();
    if (!app || !app.canvas) {
        setTimeout(registerContextMenu, 1000);
        return;
    }
    
    // 保存原始的getNodeMenuOptions
    const origGetNodeMenuOptions = app.canvas.getNodeMenuOptions;
    
    app.canvas.getNodeMenuOptions = function(node) {
        const options = origGetNodeMenuOptions ? origGetNodeMenuOptions.apply(this, arguments) : [];
        
        // 添加收藏选项
        options.push({
            content: "🐷 收藏到djsavenode",
            callback: async () => {
                // 获取节点顶部实际显示的标题
                let displayTitle = null;
                
                // 方法1: 尝试从节点的 title 属性获取（如果不等于type）
                if (node.title && node.title !== node.type) {
                    displayTitle = node.title;
                }
                
                // 方法2: 尝试从 ComfyUI 的节点定义获取翻译后的标题
                if (!displayTitle && window.LiteGraph && window.LiteGraph.registered_node_types) {
                    const nodeClass = window.LiteGraph.registered_node_types[node.type];
                    if (nodeClass) {
                        // 尝试获取 title_mode 或其他可能的标题属性
                        displayTitle = nodeClass.title || nodeClass.name;
                    }
                }
                
                // 方法3: 尝试从 ComfyUI app 的节点定义获取
                if (!displayTitle && window.app && window.app.graph) {
                    // 尝试从 ComfyUI 的内部数据结构获取
                    const nodeData = window.app.graph._nodes_by_id?.[node.id];
                    if (nodeData && nodeData.title && nodeData.title !== nodeData.type) {
                        displayTitle = nodeData.title;
                    }
                }
                
                // 方法4: 尝试直接读取节点DOM元素的文本（最可靠的方法）
                try {
                    // 查找节点对应的DOM元素
                    const canvas = document.querySelector('canvas.graph-canvas');
                    if (canvas && node.id) {
                        // 这个方法可能需要根据实际的DOM结构调整
                        // 但通常节点的标题会渲染在canvas上，我们需要从LiteGraph获取
                    }
                } catch (e) {
                }
                
                // 最后的备选方案：使用节点类型
                if (!displayTitle) {
                    displayTitle = node.properties?.["Node name for S&R"] || 
                                 node.name ||
                                 node.type;
                }
                
                // 询问用户是否要自定义名称
                const customName = prompt(`收藏节点: ${displayTitle}\n\n如需自定义名称，请输入（留空使用默认名称）:`, displayTitle);
                
                // 如果用户点击取消，则不收藏
                if (customName === null) {
                    return;
                }
                
                // 使用用户输入的名称，如果为空则使用默认名称
                const finalTitle = customName.trim() || displayTitle;
                
                const nodeData = {
                    type: node.type,
                    title: finalTitle,
                    description: `${node.type}`,
                    properties: node.properties || {},
                    size: node.size,
                    widgets: node.widgets ? node.widgets.map(w => ({
                        name: w.name,
                        type: w.type,
                        value: w.value
                    })) : []
                };
                
                try {
                    const response = await fetch('/djsavenode/api/favorites', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            node: nodeData,
                            category: currentCategory === '全部' ? '默认分类' : currentCategory
                        })
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                        showNotification('✅ 节点收藏成功!', 'success');
                        loadFavorites();
                    } else {
                        showNotification('❌ 收藏失败: ' + result.error, 'error');
                    }
                } catch (error) {
                    console.error('[djsavenode] 保存失败:', error);
                    showNotification('❌ 收藏失败', 'error');
                }
            }
        });
        
        return options;
    };
    
}

// 注册画布拖放监听
function registerCanvasDrop() {
    const app = getComfyApp();
    if (!app || !app.canvas || !app.canvas.canvas) {
        setTimeout(registerCanvasDrop, 1000);
        return;
    }

    const canvas = app.canvas.canvas;

    // 修复：只处理插件内部拖放，不影响原生拖放文件
    canvas.addEventListener('dragover', function(e) {
        if (e.dataTransfer.types.includes('application/json')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        }
        // 不处理文件拖放，交给 ComfyUI 原生
    });

    canvas.addEventListener('drop', function(e) {
        try {
            const data = e.dataTransfer.getData('application/json');
            if (!data) return; // 不是插件拖放 → 不处理

            // 阻止原生行为，只处理插件节点
            e.preventDefault();
            e.stopPropagation();

            const nodeData = JSON.parse(data);

            // 处理节点/节点组拖放
            if (nodeData.isGroup) {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const canvasX = (x / app.canvas.ds.scale) - app.canvas.ds.offset[0];
                const canvasY = (y / app.canvas.ds.scale) - app.canvas.ds.offset[1];

                let minX = Infinity, minY = Infinity;
                nodeData.nodes.forEach(nd => {
                    const p = nd.relativePos || nd.pos || [0,0];
                    if (p[0] < minX) minX = p[0];
                    if (p[1] < minY) minY = p[1];
                });

                const createdNodes = [];
                nodeData.nodes.forEach(nd => {
                    const node = LiteGraph.createNode(nd.type);
                    if (!node) return;
                    const p = nd.relativePos || nd.pos || [0,0];
                    node.pos = [canvasX + p[0] - minX, canvasY + p[1] - minY];
                    if (nd.size) node.size = nd.size;
                    if (nd.widgets && node.widgets) {
                        nd.widgets.forEach((w,i) => { if (node.widgets[i]) node.widgets[i].value = w.value; });
                    }
                    app.graph.add(node);
                    createdNodes.push(node);
                });

                if (nodeData.connections) {
                    nodeData.connections.forEach(conn => {
                        const a = createdNodes[conn.from_node_index];
                        const b = createdNodes[conn.to_node_index];
                        a?.connect(conn.from_slot, b, conn.to_slot);
                    });
                }

                showNotification(`✅ 添加节点组：${nodeData.title}`, 'success');
            } else {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const canvasX = (x / app.canvas.ds.scale) - app.canvas.ds.offset[0];
                const canvasY = (y / app.canvas.ds.scale) - app.canvas.ds.offset[1];

                const node = LiteGraph.createNode(nodeData.type);
                if (node) {
                    node.pos = [canvasX, canvasY];
                    if (nodeData.size) node.size = nodeData.size;
                    if (nodeData.widgets && node.widgets) {
                        nodeData.widgets.forEach((w,i) => { if (node.widgets[i]) node.widgets[i].value = w.value; });
                    }
                    app.graph.add(node);
                    showNotification(`✅ 添加节点：${nodeData.title}`, 'success');
                }
            }
        } catch (err) {
            console.error(err);
        }
    });
}

// 加载ComfyUI工作流JSON
function loadComfyUIWorkflow(workflowData, dropEvent) {
    const app = getComfyApp();
    if (!app || !app.graph || !app.canvas) {
        showNotification('❌ ComfyUI未就绪', 'error');
        return;
    }

    try {
        // 使用 app.canvas 而不是 app.canvas.canvas
        const canvas = app.canvas;
        const canvasCenter = canvas.ds && canvas.ds.visible_area;

        // 获取拖放位置
        let canvasX, canvasY;
        if (dropEvent) {
            const rect = app.canvas.canvas.getBoundingClientRect();
            const x = dropEvent.clientX - rect.left;
            const y = dropEvent.clientY - rect.top;
            canvasX = (x / app.canvas.ds.scale) - app.canvas.ds.offset[0];
            canvasY = (y / app.canvas.ds.scale) - app.canvas.ds.offset[1];
        } else if (canvasCenter) {
            // 如果没有位置信息且有canvasCenter，使用画布中心
            canvasX = (canvasCenter[0] + canvasCenter[2]) / 2;
            canvasY = (canvasCenter[1] + canvasCenter[3]) / 2;
        } else {
            // 如果完全没有位置信息，使用默认值
            canvasX = 100;
            canvasY = 100;
        }

        // 检查工作流格式
        if (!workflowData.nodes || !Array.isArray(workflowData.nodes)) {
            showNotification('❌ 无效的工作流JSON格式', 'error');
            return;
        }

        // 创建所有节点
        const createdNodes = {};
        let nodeCount = 0;

        // 计算节点位置的边界框
        let minX = Infinity, minY = Infinity;
        workflowData.nodes.forEach(nodeData => {
            if (nodeData.pos && nodeData.pos[0] !== undefined) {
                if (nodeData.pos[0] < minX) minX = nodeData.pos[0];
                if (nodeData.pos[1] < minY) minY = nodeData.pos[1];
            }
        });

        // 创建节点
        workflowData.nodes.forEach((nodeData, index) => {
            const node = LiteGraph.createNode(nodeData.type);

            if (!node) {
                console.warn(`[djsavenode] 无法创建节点: ${nodeData.type} (${nodeData.id})`);
                return;
            }

            // 设置节点位置
            if (nodeData.pos) {
                const offsetX = nodeData.pos[0] - minX;
                const offsetY = nodeData.pos[1] - minY;
                node.pos = [canvasX + offsetX - 200, canvasY + offsetY - 100];
            } else {
                node.pos = [canvasX + index * 50, canvasY + index * 50];
            }

            // 恢复尺寸
            if (nodeData.size) {
                node.size = nodeData.size;
            }

            // 恢复widgets值
            if (nodeData.widgets_values && node.widgets) {
                nodeData.widgets_values.forEach((value, idx) => {
                    if (node.widgets[idx]) {
                        node.widgets[idx].value = value;
                    }
                });
            }

            // 恢复属性
            if (nodeData.properties) {
                Object.assign(node.properties || {}, nodeData.properties);
            }

            // 恢复节点标题（ComfyUI使用properties中的title或Node name for S&R）
            if (nodeData.properties && nodeData.properties["Node name for S&R"]) {
                node.title = nodeData.properties["Node name for S&R"];
            } else if (nodeData.properties && nodeData.properties.title) {
                node.title = nodeData.properties.title;
            } else if (nodeData.title) {
                node.title = nodeData.title;
            }

            // 保存原始ID映射
            if (nodeData.id) {
                createdNodes[nodeData.id] = node;
            }

            // 添加到图形
            app.graph.add(node);
            nodeCount++;
        });

        // 重建连接
        if (workflowData.links && Array.isArray(workflowData.links)) {
            workflowData.links.forEach(linkData => {
                // ComfyUI工作流链接格式: [link_id, from_node_id, from_slot, to_node_id, to_slot]
                if (linkData.length >= 5) {
                    const fromNodeId = linkData[1];
                    const fromSlot = linkData[2];
                    const toNodeId = linkData[3];
                    const toSlot = linkData[4];

                    const fromNode = createdNodes[fromNodeId];
                    const toNode = createdNodes[toNodeId];

                    if (fromNode && toNode) {
                        fromNode.connect(fromSlot, toNode, toSlot);
                    }
                }
            });
        }

        // 选中所有节点
        if (nodeCount > 0) {
            const nodes = Object.values(createdNodes);
            if (nodes.length > 0) {
                canvas.selectNode(nodes[0]);
                nodes.slice(1).forEach(node => {
                    canvas.selectNode(node, true);
                });
                canvas.centerOnNode(nodes[0]);
            }
        }

        const workflowName = workflowData.name || workflowData.title || '工作流';
        showNotification(`✅ 已加载工作流: ${workflowName} (${nodeCount}个节点)`, 'success');

    } catch (error) {
        console.error('[djsavenode] 加载工作流失败:', error);
        showNotification('❌ 加载工作流失败: ' + error.message, 'error');
    }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            createButton();
            registerContextMenu();
            registerCanvasDrop();
        }, 1000);
    });
} else {
    setTimeout(() => {
        createButton();
        registerContextMenu();
        registerCanvasDrop();
    }, 1000);
}