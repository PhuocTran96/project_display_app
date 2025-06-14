class App {
    constructor() {
        this.currentUser = null;
        this.currentStore = null;
        this.categories = [];
        this.categoryData = {};
        this.allStores = []; // Lưu trữ tất cả stores để filter
        this.allStoreNames = []; // Lưu trữ store names cho autocomplete
        this.filteredStores = []; // Stores sau khi filter
        this.selectedDropdownIndex = -1; // Index của item đang được highlight trong dropdown
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuthStatus();
    }    bindEvents() {
        // Login
        document.getElementById('loginForm').addEventListener('submit', this.handleLogin.bind(this));
        
        // Change password
        document.getElementById('changePasswordBtn').addEventListener('click', this.showChangePassword.bind(this));
        document.getElementById('backToLoginBtn').addEventListener('click', this.showLogin.bind(this));
        document.getElementById('changePasswordForm').addEventListener('submit', this.handleChangePassword.bind(this));
        document.getElementById('loadUserInfoBtn').addEventListener('click', this.loadUserInfo.bind(this));
        
        // Navigation
        document.getElementById('logoutBtn').addEventListener('click', this.handleLogout.bind(this));
        document.getElementById('backToStoresBtn').addEventListener('click', this.showStores.bind(this));
        document.getElementById('backToStoresFromAdminBtn').addEventListener('click', this.showStores.bind(this));
        
        // Submit
        document.getElementById('submitBtn').addEventListener('click', this.handleSubmit.bind(this));
        
        // Admin
        document.getElementById('exportBtn').addEventListener('click', this.handleExport.bind(this));
        
        // Store search and filter
        document.getElementById('storeSearch').addEventListener('input', this.handleStoreSearch.bind(this));
        document.getElementById('storeSearch').addEventListener('keydown', this.handleSearchKeydown.bind(this));
        document.getElementById('storeSearch').addEventListener('focus', this.handleSearchFocus.bind(this));
        document.getElementById('clearFilter').addEventListener('click', this.clearStoreFilter.bind(this));
        
        // Close dropdown when clicking outside
        document.addEventListener('click', this.handleClickOutside.bind(this));
    }

    // Screen management
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }    showLoading(show = true, message = '') {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = overlay.querySelector('.loading-text');
        
        if (message && loadingText) {
            loadingText.textContent = message;
        } else if (loadingText) {
            loadingText.textContent = 'Đang tải...';
        }
        
        overlay.classList.toggle('active', show);
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Authentication
    async checkAuthStatus() {
        // For demo purposes, we'll start with login screen
        this.showScreen('loginScreen');
    }    async handleLogin(e) {
        e.preventDefault();
        this.showLoading(true);

        const formData = new FormData(e.target);
        const credentials = {
            username: formData.get('username'),
            password: formData.get('password')
        };

        console.log('Đang đăng nhập với:', credentials.username);

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials),
                credentials: 'same-origin' // Quan trọng: gửi cookie
            });

            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                console.log('Đăng nhập thành công:', this.currentUser);
                this.showToast('Đăng nhập thành công!', 'success');
                
                // Chờ một chút để đảm bảo session được lưu
                await new Promise(resolve => setTimeout(resolve, 500));
                
                if (this.currentUser.role === 'Admin') {
                    console.log('Vai trò Admin, chuyển đến trang admin/store');
                    this.showAdminOrStores();
                } else {
                    console.log('Vai trò người dùng thường, load stores');
                    await this.loadStores();
                }
            } else {
                const error = await response.json();
                console.error('Lỗi đăng nhập:', error);
                this.showToast(error.error || 'Đăng nhập thất bại', 'error');
            }
        } catch (error) {
            console.error('Lỗi kết nối:', error);
            this.showToast('Lỗi kết nối', 'error');
        } finally {
            this.showLoading(false);
        }
    }    showChangePassword() {
        // Reset form and hide user info card initially
        document.getElementById('changePasswordForm').reset();
        document.getElementById('userIdGroup').style.display = 'block';
        document.querySelector('.user-info-card').style.display = 'none';
        
        // Reset user info display
        document.getElementById('changePasswordUsername').textContent = 'Chưa đăng nhập';
        document.getElementById('changePasswordUserId').textContent = 'ID: -';
        document.getElementById('changePasswordRole').textContent = '-';
        
        // If user is already logged in, show their info directly
        if (this.currentUser) {
            document.getElementById('changePasswordUserIdInput').value = this.currentUser.id;
            this.loadUserInfo();
        }
        
        this.showScreen('changePasswordScreen');
    }    showLogin() {
        this.showScreen('loginScreen');
        document.getElementById('changePasswordForm').reset();
        
        // Reset change password screen
        document.getElementById('userIdGroup').style.display = 'block';
        document.querySelector('.user-info-card').style.display = 'none';
        document.getElementById('changePasswordUsername').textContent = 'Chưa đăng nhập';
        document.getElementById('changePasswordUserId').textContent = 'ID: -';
        document.getElementById('changePasswordRole').textContent = '-';
    }async handleChangePassword(e) {
        e.preventDefault();
        this.showLoading(true);

        const formData = new FormData(e.target);
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');
        const userId = formData.get('userId') || document.getElementById('changePasswordUserIdInput').value.trim();

        if (!userId) {
            this.showToast('Vui lòng nhập User ID trước', 'error');
            this.showLoading(false);
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showToast('Mật khẩu xác nhận không khớp', 'error');
            this.showLoading(false);
            return;
        }

        const data = {
            userId: userId,
            currentPassword: formData.get('currentPassword'),
            newPassword: newPassword
        };

        try {
            const response = await fetch('/api/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.showToast('Đổi mật khẩu thành công!', 'success');
                this.showLogin();
            } else {
                const error = await response.json();
                this.showToast(error.error || 'Đổi mật khẩu thất bại', 'error');
            }
        } catch (error) {
            this.showToast('Lỗi kết nối', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async handleLogout() {
        try {
            await fetch('/api/logout', { method: 'POST' });
            this.currentUser = null;
            this.currentStore = null;
            this.showScreen('loginScreen');
            this.showToast('Đã đăng xuất', 'success');
        } catch (error) {
            this.showToast('Lỗi đăng xuất', 'error');
        }
    }

    // Store management
    showAdminOrStores() {
        // For admin users, show both options
        if (this.currentUser.role === 'Admin') {
            this.showScreen('adminScreen');
        } else {
            this.loadStores();
        }
    }    async loadStores() {
        this.showLoading(true);

        try {
            // Thêm tham số demo=true để server trả về stores mẫu nếu không tìm thấy stores
            const response = await fetch('/api/stores?demo=true', {
                credentials: 'same-origin', // Quan trọng: gửi cookie
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            
            console.log('Response status:', response.status);
            
            if (response.ok) {
                const stores = await response.json();
                console.log('Loaded stores:', stores.length);
                this.allStores = stores; // Lưu tất cả stores
                this.filteredStores = stores; // Ban đầu hiển thị tất cả
                await this.loadStoreNames(); // Load store names cho autocomplete
                this.renderStores(stores);
                this.showScreen('storeScreen');
            } else {
                const errorText = await response.text();
                console.error('API Error:', response.status, errorText);
                this.showToast('Không thể tải danh sách cửa hàng', 'error');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            this.showToast('Lỗi kết nối', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async loadStoreNames() {
        try {
            const response = await fetch('/api/store-names');
            if (response.ok) {
                this.allStoreNames = await response.json();
                console.log('Loaded store names:', this.allStoreNames.length);
            }
        } catch (error) {
            console.error('Error loading store names:', error);
        }
    }

    renderStores(stores) {
        const storeList = document.getElementById('storeList');
        storeList.innerHTML = '';

        if (stores.length === 0) {
            // Hiển thị thông báo khi không có cửa hàng
            const noStoreMessage = document.createElement('div');
            noStoreMessage.className = 'store-item';
            noStoreMessage.style.background = '#f8d7da';
            noStoreMessage.style.color = '#721c24';
            noStoreMessage.style.border = '1px solid #f5c6cb';
            noStoreMessage.innerHTML = `
                <h3><i class="fas fa-exclamation-circle"></i> Không tìm thấy cửa hàng</h3>
                <p>Không có cửa hàng nào được gán cho tài khoản của bạn.</p>
                <p>User ID: ${this.currentUser.id}</p>
                <p>Username: ${this.currentUser.username}</p>
            `;
            storeList.appendChild(noStoreMessage);
        }

        stores.forEach(store => {
            const storeItem = document.createElement('div');
            storeItem.className = 'store-item';            storeItem.innerHTML = `
                <h3>${store['Store name']}</h3>
                <p><strong>Địa chỉ:</strong> ${store['Address (No.Street, Ward/District, City, Province/State/Region)'] || 'N/A'}</p>
                <p style="color: #667eea; font-weight: bold;"><strong>Mã cửa hàng:</strong> ${store['Store code (Fieldcheck)'] || 'N/A'}</p>
                <p><strong>Kênh:</strong> ${store['Channel'] || 'N/A'}</p>
            `;
            storeItem.addEventListener('click', () => this.selectStore(store));
            storeList.appendChild(storeItem);
        });

        // Add admin access for admin users
        if (this.currentUser.role === 'Admin') {
            const adminItem = document.createElement('div');
            adminItem.className = 'store-item';
            adminItem.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
            adminItem.style.color = 'white';
            adminItem.innerHTML = `
                <h3><i class="fas fa-cog"></i> Quản trị</h3>
                <p>Truy cập các chức năng quản trị</p>
            `;
            adminItem.addEventListener('click', () => this.showScreen('adminScreen'));
            storeList.appendChild(adminItem);
        }
    }    showStores() {
        // Reset search filter when returning to stores
        const searchInput = document.getElementById('storeSearch');
        const clearButton = document.getElementById('clearFilter');
        if (searchInput) {
            searchInput.value = '';
            clearButton.classList.remove('show');
            this.hideDropdown();
        }
        this.loadStores();
    }

    async selectStore(store) {
        this.currentStore = store;
        document.getElementById('selectedStoreName').textContent = store['Store name'];
        await this.loadCategories();
    }

    // Category management
    async loadCategories() {
        this.showLoading(true);

        try {
            const response = await fetch('/api/categories');
            if (response.ok) {
                this.categories = await response.json();
                this.initializeCategoryData();
                this.renderCategories();
                this.showScreen('categoryScreen');
            } else {
                this.showToast('Không thể tải danh mục', 'error');
            }
        } catch (error) {
            this.showToast('Lỗi kết nối', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    initializeCategoryData() {
        this.categoryData = {};
        this.categories.forEach(category => {
            this.categoryData[category.ID] = {
                id: category.ID,
                name: category.Category,
                images: [],
                note: ''
            };
        });
    }

    renderCategories() {
        const categoryList = document.getElementById('categoryList');
        categoryList.innerHTML = '';

        this.categories.forEach(category => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';
            categoryItem.innerHTML = this.getCategoryHTML(category);
            categoryList.appendChild(categoryItem);
        });

        this.updateSubmitButton();
    }

    getCategoryHTML(category) {
        const data = this.categoryData[category.ID];
        const imageCount = data.images.length;

        return `
            <div class="category-header">
                <h3>${category.Category}</h3>
                <span class="image-count">${imageCount}/8</span>
            </div>
            
            <div class="image-upload-area" onclick="app.triggerImageUpload('${category.ID}')">
                <i class="fas fa-camera"></i>
                <p>Chạm để chụp ảnh</p>
                <small>Tối đa 8 ảnh</small>
            </div>
            
            <input type="file" id="fileInput-${category.ID}" class="hidden-file-input" 
                   accept="image/*" multiple capture="environment" 
                   onchange="app.handleImageUpload('${category.ID}', this)">
            
            <div class="image-preview" id="imagePreview-${category.ID}">
                ${this.getImagePreviewHTML(data.images)}
            </div>
            
            <textarea class="note-input" 
                      placeholder="Ghi chú cho danh mục này..." 
                      value="${data.note}"
                      oninput="app.updateNote('${category.ID}', this.value)"></textarea>
        `;
    }

    getImagePreviewHTML(images) {
        return images.map((image, index) => `
            <div class="image-preview-item">
                <img src="${image}" alt="Preview">
                <button class="image-remove" onclick="app.removeImage('${this.currentCategoryId}', ${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }

    triggerImageUpload(categoryId) {
        const data = this.categoryData[categoryId];
        if (data.images.length >= 8) {
            this.showToast('Tối đa 8 ảnh cho mỗi danh mục', 'error');
            return;
        }
        document.getElementById(`fileInput-${categoryId}`).click();
    }    async handleImageUpload(categoryId, input) {
        const files = Array.from(input.files);
        const data = this.categoryData[categoryId];
        
        if (data.images.length + files.length > 8) {
            this.showToast('Tối đa 8 ảnh cho mỗi danh mục', 'error');
            return;
        }

        // Validate file types
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));
        if (invalidFiles.length > 0) {
            this.showToast('Chỉ hỗ trợ định dạng ảnh: JPG, PNG, WEBP', 'error');
            return;
        }

        // Check file sizes (max 10MB per file)
        const maxSize = 10 * 1024 * 1024; // 10MB
        const oversizedFiles = files.filter(file => file.size > maxSize);
        if (oversizedFiles.length > 0) {
            this.showToast('Kích thước ảnh không được vượt quá 10MB', 'error');
            return;
        }

        this.showLoading(true, 'Đang xử lý ảnh...');        try {
            let totalOriginalSize = 0;
            let totalCompressedSize = 0;
            
            // Process files one by one with progress
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const progressMessage = files.length > 1 ? 
                    `Đang xử lý ảnh ${i + 1}/${files.length}...` : 
                    'Đang nén ảnh...';
                
                // Update loading message
                const loadingText = document.querySelector('.loading-text');
                if (loadingText) {
                    loadingText.textContent = progressMessage;
                }
                
                totalOriginalSize += file.size;
                const compressedDataUrl = await this.compressImage(file);
                totalCompressedSize += Math.round(compressedDataUrl.length * 0.75);
                
                data.images.push(compressedDataUrl);
                this.updateCategoryDisplay(categoryId);
            }
            
            // Show compression summary
            const totalSavings = ((totalOriginalSize - totalCompressedSize) / totalOriginalSize * 100).toFixed(1);
            const message = files.length === 1 ? 
                `Đã thêm 1 ảnh (tiết kiệm ${totalSavings}% dung lượng)` :
                `Đã thêm ${files.length} ảnh (tiết kiệm ${totalSavings}% dung lượng)`;
                
            this.showToast(message, 'success');
        } catch (error) {
            console.error('Error processing images:', error);
            this.showToast('Lỗi xử lý ảnh', 'error');
        } finally {
            this.showLoading(false);
        }

        // Clear input
        input.value = '';
    }

    /**
     * Compress image to reduce file size while maintaining good quality
     * @param {File} file - The image file to compress
     * @returns {Promise<string>} - The compressed image as data URL
     */
    async compressImage(file) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                try {
                    // Calculate optimal dimensions
                    const { width, height } = this.calculateOptimalSize(img.width, img.height);
                    
                    canvas.width = width;
                    canvas.height = height;

                    // Enable image smoothing for better quality
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';

                    // Draw and compress
                    ctx.drawImage(img, 0, 0, width, height);

                    // Determine optimal quality and format
                    const { quality, format } = this.getOptimalQuality(file.size);
                    
                    const compressedDataUrl = canvas.toDataURL(format, quality);
                          // Check compression effectiveness
                const originalSize = file.size;
                const compressedSize = Math.round(compressedDataUrl.length * 0.75); // Rough estimate
                const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
                
                console.log(`📸 Image compressed: ${file.name}`);
                console.log(`   Original: ${this.formatFileSize(originalSize)} (${img.width}x${img.height})`);
                console.log(`   Compressed: ${this.formatFileSize(compressedSize)} (${width}x${height})`);
                console.log(`   Reduction: ${compressionRatio}% | Quality: ${(quality * 100).toFixed(0)}%`);
                
                resolve(compressedDataUrl);
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = URL.createObjectURL(file);
        });
    }

    /**
     * Calculate optimal image dimensions for compression
     * @param {number} originalWidth - Original image width
     * @param {number} originalHeight - Original image height
     * @returns {Object} - Optimal width and height
     */
    calculateOptimalSize(originalWidth, originalHeight) {
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1920;
        const MAX_PIXELS = 2073600; // 1920x1080

        let { width, height } = { width: originalWidth, height: originalHeight };

        // If image is very large, scale down to reasonable size
        if (width * height > MAX_PIXELS) {
            const scale = Math.sqrt(MAX_PIXELS / (width * height));
            width = Math.round(width * scale);
            height = Math.round(height * scale);
        }

        // Ensure dimensions don't exceed maximums
        if (width > MAX_WIDTH) {
            const scale = MAX_WIDTH / width;
            width = MAX_WIDTH;
            height = Math.round(height * scale);
        }

        if (height > MAX_HEIGHT) {
            const scale = MAX_HEIGHT / height;
            height = MAX_HEIGHT;
            width = Math.round(width * scale);
        }

        return { width, height };
    }

    /**
     * Determine optimal quality and format based on file size
     * @param {number} fileSize - Original file size in bytes
     * @returns {Object} - Optimal quality and format
     */
    getOptimalQuality(fileSize) {
        const MB = 1024 * 1024;
        
        // For very large files, use more aggressive compression
        if (fileSize > 5 * MB) {
            return { quality: 0.6, format: 'image/jpeg' };
        } else if (fileSize > 2 * MB) {
            return { quality: 0.7, format: 'image/jpeg' };
        } else if (fileSize > 1 * MB) {
            return { quality: 0.8, format: 'image/jpeg' };
        } else {
            return { quality: 0.85, format: 'image/jpeg' };
        }
    }

    /**
     * Format file size for display
     * @param {number} bytes - File size in bytes
     * @returns {string} - Formatted file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    removeImage(categoryId, imageIndex) {
        const data = this.categoryData[categoryId];
        data.images.splice(imageIndex, 1);
        this.updateCategoryDisplay(categoryId);
    }

    updateNote(categoryId, note) {
        this.categoryData[categoryId].note = note;
        this.updateSubmitButton();
    }

    updateCategoryDisplay(categoryId) {
        const category = this.categories.find(c => c.ID === categoryId);
        const categoryElement = document.querySelector(`#categoryList .category-item:nth-child(${this.categories.indexOf(category) + 1})`);
        categoryElement.innerHTML = this.getCategoryHTML(category);
        this.updateSubmitButton();
    }

    updateSubmitButton() {
        const hasAnyImages = Object.values(this.categoryData).some(data => data.images.length > 0);
        document.getElementById('submitBtn').style.display = hasAnyImages ? 'block' : 'none';
    }

    // Submission
    async handleSubmit() {
        const submissionData = Object.values(this.categoryData)
            .filter(data => data.images.length > 0)
            .map(data => ({
                categoryId: data.id,
                categoryName: data.name,
                note: data.note,
                imageCount: data.images.length
            }));

        if (submissionData.length === 0) {
            this.showToast('Vui lòng chụp ít nhất 1 ảnh', 'error');
            return;
        }

        this.showLoading(true);        try {
            const formData = new FormData();
            // Use store code or fall back to STT if store code is not available
            const storeId = this.currentStore['Store code (Fieldcheck)'] || this.currentStore.STT;
            formData.append('storeId', storeId);
            formData.append('submissions', JSON.stringify(submissionData));

            // Add all images
            Object.values(this.categoryData).forEach(data => {
                data.images.forEach(imageDataUrl => {
                    const blob = this.dataURLtoBlob(imageDataUrl);
                    formData.append('images', blob);
                });
            });

            const response = await fetch('/api/submit', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                this.showToast('Gửi kết quả thành công!', 'success');
                this.initializeCategoryData();
                this.renderCategories();
            } else {
                const error = await response.json();
                this.showToast(error.error || 'Gửi thất bại', 'error');
            }
        } catch (error) {
            this.showToast('Lỗi kết nối', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    dataURLtoBlob(dataURL) {
        const arr = dataURL.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }

    // Admin functions
    async handleExport() {
        this.showLoading(true);
        try {
            const response = await fetch('/api/admin/export');
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `submissions_${new Date().toISOString().split('T')[0]}.xlsx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                this.showToast('Xuất file thành công', 'success');
            } else {
                this.showToast('Lỗi xuất file', 'error');
            }
        } catch (error) {
            this.showToast('Lỗi kết nối', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Store search and filter methods
    handleStoreSearch(e) {
        const searchTerm = e.target.value.toLowerCase().trim();
        this.selectedDropdownIndex = -1;
        
        // Show/hide clear button
        const clearButton = document.getElementById('clearFilter');
        if (searchTerm) {
            clearButton.classList.add('show');
        } else {
            clearButton.classList.remove('show');
        }

        if (searchTerm === '') {
            this.hideDropdown();
            this.filteredStores = this.allStores;
            this.renderStores(this.filteredStores);
            return;
        }

        // Filter store names for autocomplete
        const matchingStoreNames = this.allStoreNames.filter(store => 
            store.name.toLowerCase().includes(searchTerm) ||
            store.code.toLowerCase().includes(searchTerm) ||
            store.address.toLowerCase().includes(searchTerm)
        ).slice(0, 10); // Limit to 10 results

        this.showDropdown(matchingStoreNames, searchTerm);

        // Filter actual stores in the list
        this.filteredStores = this.allStores.filter(store => 
            store['Store name'].toLowerCase().includes(searchTerm) ||
            store['Store code (Fieldcheck)'].toLowerCase().includes(searchTerm) ||
            store['Address (No.Street, Ward/District, City, Province/State/Region)'].toLowerCase().includes(searchTerm)
        );

        this.renderStores(this.filteredStores);
    }

    handleSearchKeydown(e) {
        const dropdown = document.getElementById('storeDropdown');
        const items = dropdown.querySelectorAll('.dropdown-item:not(.no-results)');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.selectedDropdownIndex = Math.min(this.selectedDropdownIndex + 1, items.length - 1);
            this.highlightDropdownItem(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.selectedDropdownIndex = Math.max(this.selectedDropdownIndex - 1, -1);
            this.highlightDropdownItem(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (this.selectedDropdownIndex >= 0 && items[this.selectedDropdownIndex]) {
                this.selectStoreFromDropdown(items[this.selectedDropdownIndex]);
            }
        } else if (e.key === 'Escape') {
            this.hideDropdown();
        }
    }

    handleSearchFocus(e) {
        const searchTerm = e.target.value.toLowerCase().trim();
        if (searchTerm && this.allStoreNames.length > 0) {
            this.handleStoreSearch(e);
        }
    }

    handleClickOutside(e) {
        const searchContainer = document.querySelector('.search-container');
        if (!searchContainer.contains(e.target)) {
            this.hideDropdown();
        }
    }

    showDropdown(stores, searchTerm) {
        const dropdown = document.getElementById('storeDropdown');
        dropdown.innerHTML = '';

        if (stores.length === 0) {
            dropdown.innerHTML = '<div class="no-results">Không tìm thấy cửa hàng nào</div>';
        } else {
            stores.forEach((store, index) => {
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                item.dataset.storeCode = store.code;
                
                // Highlight matching text
                const highlightedName = this.highlightText(store.name, searchTerm);
                const highlightedCode = this.highlightText(store.code, searchTerm);
                const highlightedAddress = this.highlightText(store.address || '', searchTerm);

                item.innerHTML = `
                    <h4>${highlightedName}</h4>
                    <p><span class="store-code">${highlightedCode}</span></p>
                    <p>${highlightedAddress}</p>
                `;

                item.addEventListener('click', () => this.selectStoreFromDropdown(item));
                dropdown.appendChild(item);
            });
        }

        dropdown.classList.add('show');
    }

    hideDropdown() {
        const dropdown = document.getElementById('storeDropdown');
        dropdown.classList.remove('show');
        this.selectedDropdownIndex = -1;
    }

    highlightDropdownItem(items) {
        items.forEach((item, index) => {
            if (index === this.selectedDropdownIndex) {
                item.classList.add('highlighted');
            } else {
                item.classList.remove('highlighted');
            }
        });
    }

    selectStoreFromDropdown(item) {
        const storeCode = item.dataset.storeCode;
        const store = this.allStores.find(s => s['Store code (Fieldcheck)'] === storeCode);
        
        if (store) {
            const searchInput = document.getElementById('storeSearch');
            searchInput.value = store['Store name'];
            this.hideDropdown();
            
            // Filter to show only this store
            this.filteredStores = [store];
            this.renderStores(this.filteredStores);
            
            // Auto-select the store if it's the only one
            setTimeout(() => {
                this.selectStore(store);
            }, 300);
        }
    }

    highlightText(text, searchTerm) {
        if (!searchTerm || !text) return text;
        
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    clearStoreFilter() {
        const searchInput = document.getElementById('storeSearch');
        const clearButton = document.getElementById('clearFilter');
        
        searchInput.value = '';
        clearButton.classList.remove('show');
        this.hideDropdown();
        this.filteredStores = this.allStores;
        this.renderStores(this.filteredStores);
        searchInput.focus();
    }

    async loadUserInfo() {
        const userId = document.getElementById('changePasswordUserIdInput').value.trim();
        
        if (!userId) {
            this.showToast('Vui lòng nhập User ID', 'error');
            return;
        }
        
        this.showLoading(true);
        
        try {
            const response = await fetch('/api/get-user-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            
            if (response.ok) {
                const userInfo = await response.json();
                
                // Update user info display
                document.getElementById('changePasswordUsername').textContent = userInfo.username || 'Không có tên';
                document.getElementById('changePasswordUserId').textContent = `ID: ${userInfo.id || 'N/A'}`;
                document.getElementById('changePasswordRole').textContent = userInfo.role || 'N/A';
                
                // Set role color based on role type
                const roleElement = document.getElementById('changePasswordRole');
                if (userInfo.role === 'Admin') {
                    roleElement.style.background = 'linear-gradient(135deg, #ff6b6b, #ee5a52)';
                } else if (userInfo.role === 'TDL') {
                    roleElement.style.background = 'linear-gradient(135deg, #4ecdc4, #44a08d)';
                } else if (userInfo.role === 'TDS') {
                    roleElement.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
                } else {
                    roleElement.style.background = 'linear-gradient(135deg, #999, #777)';
                }
                
                // Hide user ID input group and show user info card
                document.getElementById('userIdGroup').style.display = 'none';
                document.querySelector('.user-info-card').style.display = 'flex';
                
                this.showToast('Đã tải thông tin người dùng thành công!', 'success');
                
            } else {
                const error = await response.json();
                this.showToast(error.error || 'Không tìm thấy người dùng', 'error');
            }
            
        } catch (error) {
            console.error('Load user info error:', error);
            this.showToast('Lỗi kết nối', 'error');
        } finally {
            this.showLoading(false);
        }
    }
}

// Initialize app
const app = new App();
