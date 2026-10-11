// نظام المصادقة وإدخال البيانات المتكامل
document.addEventListener('DOMContentLoaded', function() {
    console.log("بدء تحميل نظام المصادقة وإدخال البيانات...");
    
    // تهيئة قاعدة البيانات أولاً
    initDatabase();
    
    // التحقق من وجود النماذج في الصفحة
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        console.log("تم ربط نموذج تسجيل الدخول");
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
        console.log("تم ربط نموذج التسجيل");
    }
    
    // التحقق من حالة تسجيل الدخول عند تحميل الصفحة
    const authStatus = checkAuthStatus();
    
    // تحميل بيانات المستخدم إذا كان مسجلاً
    if (isLoggedIn()) {
        loadUserData();
        console.log("تم تحميل بيانات المستخدم");
        
        // تهيئة صفحة إدخال البيانات إذا كانت الصفحة الحالية
        if (document.getElementById('current-balance') || document.getElementById('data-entry-form')) {
            console.log("تهيئة صفحة إدخال البيانات...");
            initDataEntry();
            setTimeout(initializeAllEventListeners, 100);
        }
    }
    
    // ربط الأزرار العامة
    setTimeout(bindGeneralButtons, 500);
});

// ========== قسم المصادقة ==========

// تهيئة قاعدة البيانات إذا لم تكن موجودة
function initDatabase() {
    console.log("تهيئة قاعدة البيانات...");
    
    const databases = [
        'mowafr_users',
        'mowafr_consumption_data',
        'mowafr_appliances_data',
        'mowafr_history_data',
        'mowafr_notifications_data'
    ];
    
    databases.forEach(db => {
        if (!localStorage.getItem(db)) {
            localStorage.setItem(db, db.includes('users') ? '[]' : '{}');
            console.log(`تم إنشاء ${db}`);
        }
    });
}

// رسالة داخل النموذج (بديل عن alert لتناسب الهاتف)
function authMessage(form, text, type) {
    if (!form) { alert(text); return; }
    let box = form.querySelector('.auth-message');
    if (!box) {
        box = document.createElement('div');
        box.className = 'auth-message';
        box.setAttribute('role', 'alert');
        form.insertBefore(box, form.firstChild);
    }
    box.textContent = text;
    box.className = 'auth-message ' + (type || 'error');
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function setBusy(form, busy) {
    const btn = form && form.querySelector('button[type="submit"]');
    if (!btn) return;
    btn.disabled = busy;
    btn.classList.toggle('is-busy', busy);
}

function ensureApiConfigured(form) {
    if (window.MowafrAPI && window.MowafrAPI.isConfigured()) return true;
    authMessage(form, 'لم يتم ضبط رابط الخادم بعد. عدّل الملف js/config.js وضع رابط الـ Worker.', 'error');
    return false;
}

// تسجيل مستخدم جديد (عبر Cloudflare Worker + D1)
async function handleRegister(event) {
    event.preventDefault();
    const form = event.target;

    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const phone = (document.getElementById('phone').value || '').trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!fullName || !email || !password || !confirmPassword) {
        return authMessage(form, 'يرجى ملء جميع الحقول المطلوبة');
    }
    if (password !== confirmPassword) {
        return authMessage(form, 'كلمة المرور وتأكيدها غير متطابقين');
    }
    if (password.length < 6) {
        return authMessage(form, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    }
    if (!validateEmail(email)) {
        return authMessage(form, 'البريد الإلكتروني غير صحيح');
    }
    if (!ensureApiConfigured(form)) return;

    setBusy(form, true);
    try {
        await MowafrAPI.register({ fullName, email, phone, password });
        authMessage(form, 'تم إنشاء الحساب بنجاح! جاري تحويلك...', 'success');
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 600);
    } catch (err) {
        setBusy(form, false);
        authMessage(form, err.status ? err.message : 'تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.');
    }
}

// تسجيل دخول المستخدم
async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;

    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        return authMessage(form, 'يرجى إدخال البريد الإلكتروني وكلمة المرور');
    }
    if (!ensureApiConfigured(form)) return;

    setBusy(form, true);
    try {
        await MowafrAPI.login(email, password);
        window.location.href = 'dashboard.html';
    } catch (err) {
        setBusy(form, false);
        authMessage(form, err.status ? err.message : 'تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.');
    }
}

// تسجيل الخروج
async function logout() {
    try { await MowafrAPI.flush(); } catch (e) {}
    await MowafrAPI.logout();
    window.location.href = 'index.html';
}

// التحقق من حالة تسجيل الدخول
function checkAuthStatus() {
    const currentPage = window.location.pathname.split('/').pop();
    
    // الصفحات التي تتطلب تسجيل دخول
    const protectedPages = [
        'dashboard.html',
        'data-entry.html',
        'history.html',
        'notifications.html',
        'results.html',
        'profile.html'
    ];
    
    const isProtectedPage = protectedPages.includes(currentPage);
    
    if (isProtectedPage && !isLoggedIn()) {
        window.location.href = 'login.html';
        return false;
    }
    
    const authPages = ['login.html', 'register.html'];
    if (authPages.includes(currentPage) && isLoggedIn()) {
        window.location.href = 'dashboard.html';
        return false;
    }
    
    return true;
}

// التحقق إذا كان المستخدم مسجلاً دخولاً
function isLoggedIn() {
    return !!sessionStorage.getItem('currentUserId');
}

// الحصول على بيانات المستخدم الحالي
function getCurrentUser() {
    const userId = sessionStorage.getItem('currentUserId');
    if (!userId) return null;
    
    const users = JSON.parse(localStorage.getItem('mowafr_users') || '[]');
    return users.find(user => user.id === userId);
}

// الحصول على بيانات استهلاك المستخدم الحالي
function getUserConsumptionData() {
    const userId = sessionStorage.getItem('currentUserId');
    if (!userId) return null;
    
    const consumptionData = JSON.parse(localStorage.getItem('mowafr_consumption_data') || '{}');
    return consumptionData[userId] || null;
}

// الحصول على أجهزة المستخدم الحالي
function getUserAppliances() {
    const userId = sessionStorage.getItem('currentUserId');
    if (!userId) return [];
    
    const appliancesData = JSON.parse(localStorage.getItem('mowafr_appliances_data') || '{}');
    return appliancesData[userId] || [];
}

// الحصول على سجل المستخدم الحالي
function getUserHistory() {
    const userId = sessionStorage.getItem('currentUserId');
    if (!userId) return [];
    
    const historyData = JSON.parse(localStorage.getItem('mowafr_history_data') || '{}');
    return historyData[userId] || [];
}

// الحصول على إشعارات المستخدم الحالي
function getUserNotifications() {
    const userId = sessionStorage.getItem('currentUserId');
    if (!userId) return [];
    
    const notificationsData = JSON.parse(localStorage.getItem('mowafr_notifications_data') || '{}');
    return notificationsData[userId] || [];
}

// تحديث بيانات استهلاك المستخدم
function updateUserConsumptionData(data) {
    const userId = sessionStorage.getItem('currentUserId');
    if (!userId) return false;
    
    const consumptionData = JSON.parse(localStorage.getItem('mowafr_consumption_data') || '{}');
    consumptionData[userId] = {
        ...consumptionData[userId],
        ...data,
        lastUpdate: new Date().toISOString()
    };
    
    localStorage.setItem('mowafr_consumption_data', JSON.stringify(consumptionData));
    return true;
}

// إضافة جهاز للمستخدم
function addUserAppliance(appliance) {
    const userId = sessionStorage.getItem('currentUserId');
    if (!userId) return false;
    
    const appliancesData = JSON.parse(localStorage.getItem('mowafr_appliances_data') || '{}');
    if (!appliancesData[userId]) {
        appliancesData[userId] = [];
    }
    
    appliance.id = generateApplianceId();
    appliance.addedDate = new Date().toISOString();
    
    appliancesData[userId].push(appliance);
    localStorage.setItem('mowafr_appliances_data', JSON.stringify(appliancesData));
    
    return appliance.id;
}

// إضافة سجل للمستخدم
function addUserHistory(historyItem) {
    const userId = sessionStorage.getItem('currentUserId');
    if (!userId) return false;
    
    const historyData = JSON.parse(localStorage.getItem('mowafr_history_data') || '{}');
    if (!historyData[userId]) {
        historyData[userId] = [];
    }
    
    historyItem.id = generateHistoryId();
    historyItem.date = new Date().toISOString();
    
    historyData[userId].push(historyItem);
    localStorage.setItem('mowafr_history_data', JSON.stringify(historyData));
    
    return historyItem.id;
}

// إضافة إشعار للمستخدم
function addUserNotification(notification) {
    const userId = sessionStorage.getItem('currentUserId');
    if (!userId) return false;
    
    const notificationsData = JSON.parse(localStorage.getItem('mowafr_notifications_data') || '{}');
    if (!notificationsData[userId]) {
        notificationsData[userId] = [];
    }
    
    notification.id = generateNotificationId();
    notification.date = new Date().toISOString();
    notification.read = false;
    
    notificationsData[userId].push(notification);
    localStorage.setItem('mowafr_notifications_data', JSON.stringify(notificationsData));
    
    return notification.id;
}

// ========== قسم إدخال البيانات ==========

function initDataEntry() {
    console.log("تهيئة إدخال البيانات...");
    
    // تحميل الأجهزة المضافة
    const appliances = getUserAppliances();
    if (appliances.length > 0) {
        updateAppliancesList(appliances);
    } else {
        showEmptyAppliancesMessage();
    }
    
    // تحميل قائمة الأجهزة الافتراضية
    loadDefaultAppliances();
    
    // تحميل الرصيد الحالي إذا كان موجوداً
    const consumptionData = getUserConsumptionData();
    if (consumptionData && consumptionData.balance > 0) {
        const balanceInput = document.getElementById('current-balance');
        if (balanceInput) {
            balanceInput.value = consumptionData.balance;
        }
    }
    
    // التحقق إذا كان هناك جهاز للتعديل
    const editApplianceId = sessionStorage.getItem('editApplianceId');
    if (editApplianceId) {
        loadApplianceForEdit(editApplianceId);
        sessionStorage.removeItem('editApplianceId');
    }
}

function loadDefaultAppliances() {
    const applianceSelect = document.getElementById('appliance-select');
    if (!applianceSelect) return;
    
    // تفريغ القائمة أولاً
    applianceSelect.innerHTML = '<option value="">-- اختر جهازًا --</option>';
    
    // الأجهزة الافتراضية
    const defaultAppliances = [
        { id: 1, name: "تكييف (1.5 طن)", power_kw: 1.5 },
        { id: 2, name: "ثلاجة متوسطة", power_kw: 0.2 },
        { id: 3, name: "غسالة أتوماتيك", power_kw: 0.5 },
        { id: 4, name: "تلفزيون LED", power_kw: 0.1 },
        { id: 5, name: "سخان مياه", power_kw: 2.0 },
        { id: 6, name: "مروحة سقف", power_kw: 0.075 },
        { id: 7, name: "مكواة", power_kw: 1.0 },
        { id: 8, name: "مايكروويف", power_kw: 0.8 },
        { id: 9, name: "كمبيوتر مكتبي", power_kw: 0.15 },
        { id: 10, name: "لمبة LED", power_kw: 0.01 }
    ];
    
    defaultAppliances.forEach(appliance => {
        const option = document.createElement('option');
        option.value = appliance.id;
        option.textContent = `${appliance.name} (${appliance.power_kw} كيلوواط)`;
        option.dataset.power = appliance.power_kw;
        option.dataset.name = appliance.name.split('(')[0].trim();
        applianceSelect.appendChild(option);
    });
}

// تهيئة جميع Event Listeners
function initializeAllEventListeners() {
    console.log("تهيئة جميع Event Listeners...");
    
    // ========== أزرار إدخال البيانات ==========
    
    // زر حفظ الرصيد
    const saveBalanceBtn = document.getElementById('save-balance');
    if (saveBalanceBtn) {
        saveBalanceBtn.addEventListener('click', function(e) {
            e.preventDefault();
            saveBalance();
        });
        console.log("تم ربط زر حفظ الرصيد");
    }
    
    // زر إضافة/تعديل جهاز
    const addApplianceBtn = document.getElementById('add-appliance');
    if (addApplianceBtn) {
        addApplianceBtn.addEventListener('click', function(e) {
            e.preventDefault();
            handleAddAppliance();
        });
        console.log("تم ربط زر إضافة جهاز");
    }
    
    // زر مسح النموذج
    const resetFormBtn = document.getElementById('reset-form');
    if (resetFormBtn) {
        resetFormBtn.addEventListener('click', function(e) {
            e.preventDefault();
            resetForm();
        });
        console.log("تم ربط زر مسح النموذج");
    }
    
    // زر حساب الاستهلاك
    const calculateBtn = document.getElementById('calculate-consumption');
    if (calculateBtn) {
        calculateBtn.addEventListener('click', function(e) {
            e.preventDefault();
            calculateTotalConsumption();
        });
        console.log("تم ربط زر حساب الاستهلاك");
    }
    
    // زر حفظ جميع البيانات
    const saveAllBtn = document.getElementById('save-all-data');
    if (saveAllBtn) {
        saveAllBtn.addEventListener('click', function(e) {
            e.preventDefault();
            saveAllData();
        });
        console.log("تم ربط زر حفظ جميع البيانات");
    }
    
    // زر حفظ في السجل
    const saveHistoryBtn = document.getElementById('save-to-history');
    if (saveHistoryBtn) {
        saveHistoryBtn.addEventListener('click', function(e) {
            e.preventDefault();
            saveToHistory();
        });
        console.log("تم ربط زر حفظ في السجل");
    }
    
    // زر طباعة التقرير
    const printReportBtn = document.getElementById('print-report');
    if (printReportBtn) {
        printReportBtn.addEventListener('click', function(e) {
            e.preventDefault();
            printReport();
        });
        console.log("تم ربط زر طباعة التقرير");
    }
    
    // ========== أزرار أخرى ==========
    
    // زر تسجيل الخروج
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
        console.log("تم ربط زر تسجيل الخروج");
    }
    
    // تحديث استهلاك الجهاز عند اختياره من القائمة
    const applianceSelect = document.getElementById('appliance-select');
    if (applianceSelect) {
        applianceSelect.addEventListener('change', function() {
            if (this.value && this.selectedIndex > 0) {
                const power = parseFloat(this.options[this.selectedIndex].dataset.power);
                const name = this.options[this.selectedIndex].dataset.name;
                const powerInput = document.getElementById('power-consumption');
                const nameInput = document.getElementById('custom-appliance');
                
                if (powerInput) powerInput.value = power;
                if (nameInput && name) nameInput.value = name;
            }
        });
        console.log("تم ربط اختيار الجهاز");
    }
    
    // تمكين الأزرار إذا كان هناك رصيد
    const currentBalance = parseFloat(document.getElementById('current-balance')?.value || 0);
    if (currentBalance > 0) {
        enableCalculationButtons();
    }
}

// ربط الأزرار العامة
function bindGeneralButtons() {
    console.log("ربط الأزرار العامة...");
    
    // ربط أي أزرار إضافية هنا
}

function saveBalance() {
    console.log("حفظ الرصيد...");
    
    const balanceInput = document.getElementById('current-balance');
    const balance = parseFloat(balanceInput.value) || 0;
    
    if (balance <= 0) {
        showMessage('يرجى إدخال قيمة رصيد صحيحة', 'error');
        return;
    }
    
    // حفظ الرصيد
    const consumptionData = getUserConsumptionData() || {};
    consumptionData.balance = balance;
    consumptionData.lastUpdate = new Date().toISOString();
    
    if (updateUserConsumptionData(consumptionData)) {
        showMessage(`تم حفظ الرصيد بنجاح: ${balance} ج.م`, 'success');
        
        // إضافة إشعار
        addUserNotification({
            type: 'success',
            title: 'تم تحديث الرصيد',
            message: `تم حفظ رصيدك الجديد: ${balance} ج.م`,
            icon: 'fas fa-coins'
        });
        
        // تفعيل أزرار الحساب
        enableCalculationButtons();
    } else {
        showMessage('حدث خطأ في حفظ الرصيد', 'error');
    }
}

function enableCalculationButtons() {
    const buttons = [
        document.getElementById('calculate-consumption'),
        document.getElementById('save-all-data')
    ];
    
    buttons.forEach(btn => {
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        }
    });
}

function handleAddAppliance() {
    console.log("إضافة جهاز جديد...");
    
    const customName = document.getElementById('custom-appliance').value.trim();
    const powerConsumption = parseFloat(document.getElementById('power-consumption').value) || 0;
    const hoursUsage = parseFloat(document.getElementById('hours-usage').value) || 0;
    const quantity = parseInt(document.getElementById('quantity').value) || 1;
    
    // التحقق من صحة البيانات
    if (!customName) {
        showMessage('يرجى إدخال اسم الجهاز', 'error');
        return;
    }
    
    if (powerConsumption <= 0) {
        showMessage('يرجى إدخال استهلاك صحيح للجهاز', 'error');
        return;
    }
    
    if (hoursUsage < 0 || hoursUsage > 24) {
        showMessage('ساعات التشغيل يجب أن تكون بين 0 و 24', 'error');
        return;
    }
    
    if (quantity <= 0) {
        showMessage('العدد يجب أن يكون 1 على الأقل', 'error');
        return;
    }
    
    // إنشاء كائن الجهاز
    const appliance = {
        name: customName,
        power_kw: powerConsumption,
        hours: hoursUsage,
        quantity: quantity
    };
    
    const addButton = document.getElementById('add-appliance');
    
    // إذا كان تعديلاً لجهاز موجود
    if (addButton.dataset.editId) {
        updateExistingAppliance(addButton.dataset.editId, appliance);
        delete addButton.dataset.editId;
        addButton.innerHTML = '<i class="fas fa-plus"></i> إضافة الجهاز';
        addButton.classList.remove('btn-warning');
        addButton.classList.add('btn-primary');
    } else {
        // إضافة جهاز جديد
        const applianceId = addUserAppliance(appliance);
        
        if (applianceId) {
            showMessage('تم إضافة الجهاز بنجاح', 'success');
            
            // إضافة إشعار
            addUserNotification({
                type: 'success',
                title: 'تم إضافة جهاز جديد',
                message: `تمت إضافة ${customName} إلى قائمة أجهزتك`,
                icon: 'fas fa-plug'
            });
        }
    }
    
    // تحديث القائمة وإعادة تعيين النموذج
    updateAppliancesList(getUserAppliances());
    resetFormFields();
}

function updateAppliancesList(appliances) {
    const container = document.getElementById('appliances-container');
    if (!container) return;
    
    if (!appliances || appliances.length === 0) {
        showEmptyAppliancesMessage();
        return;
    }
    
    let html = '';
    
    appliances.forEach(appliance => {
        const dailyConsumption = (appliance.power_kw * appliance.hours * (appliance.quantity || 1)).toFixed(2);
        
        html += `
            <div class="appliance-item" id="appliance-${appliance.id}">
                <div class="appliance-info">
                    <h4><i class="fas fa-plug"></i> ${appliance.name}</h4>
                    <div class="appliance-stats">
                        <div class="stat">
                            <span class="stat-label">الاستهلاك</span>
                            <span class="stat-value">${appliance.power_kw} ك.و/س</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">ساعات التشغيل</span>
                            <span class="stat-value">${appliance.hours} ساعة/يوم</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">العدد</span>
                            <span class="stat-value">${appliance.quantity || 1}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">الاستهلاك اليومي</span>
                            <span class="stat-value">${dailyConsumption} ك.و/س</span>
                        </div>
                    </div>
                </div>
                <div class="appliance-actions">
                    <button class="btn btn-secondary" onclick="editAppliance('${appliance.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="deleteAppliance('${appliance.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function showEmptyAppliancesMessage() {
    const container = document.getElementById('appliances-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-plug"></i>
            <h4>لا توجد أجهزة مضافة</h4>
            <p>أضف أجهزتك الكهربائية لبدء حساب استهلاكك</p>
        </div>
    `;
}

function calculateTotalConsumption() {
    console.log("حساب الاستهلاك الكلي...");
    
    const appliances = getUserAppliances();
    const balanceInput = document.getElementById('current-balance');
    const currentBalance = parseFloat(balanceInput.value) || 0;
    
    if (appliances.length === 0) {
        showMessage('يرجى إضافة أجهزة أولاً', 'error');
        return;
    }
    
    if (currentBalance <= 0) {
        showMessage('يرجى إدخال الرصيد أولاً', 'error');
        return;
    }
    
    // حساب الاستهلاك اليومي الإجمالي
    let totalDailyConsumption = 0;
    appliances.forEach(appliance => {
        totalDailyConsumption += appliance.power_kw * appliance.hours * (appliance.quantity || 1);
    });
    
    // حساب الاستهلاك الشهري
    const monthlyConsumption = totalDailyConsumption * 30;
    
    // حساب التكلفة باستخدام الشرائح
    const monthlyCost = window.ElectricityCalculator ? 
        window.ElectricityCalculator.calculateElectricityCost(monthlyConsumption) : 
        (monthlyConsumption * 0.5);
    
    // تحديد الشريحة الحالية
    const currentSlab = window.ElectricityCalculator ? 
        window.ElectricityCalculator.getCurrentSlab(monthlyConsumption) : 
        'غير محدد';
    
    // حساب عدد الأيام المتبقية
    const remainingDays = currentBalance > 0 ? Math.floor((currentBalance / monthlyCost) * 30) : 0;
    
    // تحديث واجهة النتائج
    updateResultsUI(totalDailyConsumption, monthlyConsumption, monthlyCost);
    
    // تحديث تفاصيل الشرائح
    updateSlabDetails(monthlyConsumption, monthlyCost, currentSlab);
    
    // تحديث التوصيات
    updateRecommendations(monthlyConsumption, remainingDays, currentBalance);
    
    // إظهار قسم النتائج
    showResultsSection();
    
    // تحديث بيانات المستخدم
    updateUserConsumption({
        balance: currentBalance,
        dailyConsumption: totalDailyConsumption,
        monthlyConsumption: monthlyConsumption,
        monthlyCost: monthlyCost,
        currentSlab: currentSlab,
        remainingDays: remainingDays
    });
    
    showMessage('تم حساب الاستهلاك بنجاح', 'success');
}

function updateResultsUI(daily, monthly, cost) {
    const elements = {
        'daily-consumption': daily.toFixed(2),
        'monthly-consumption-result': monthly.toFixed(2),
        'monthly-cost-result': cost.toFixed(2)
    };
    
    Object.keys(elements).forEach(id => {
        const elem = document.getElementById(id);
        if (elem) elem.textContent = elements[id];
    });
}

function updateSlabDetails(monthlyConsumption, monthlyCost, currentSlab) {
    const slabDetails = document.getElementById('slab-details');
    if (!slabDetails) return;
    
    let detailsHTML = `
        <div style="padding: 15px; background-color: #f8f9fa; border-radius: var(--border-radius);">
            <p><strong>الشريحة الحالية:</strong> ${currentSlab}</p>
            <p><strong>الاستهلاك الشهري:</strong> ${monthlyConsumption.toFixed(2)} كيلوواط/ساعة</p>
            <p><strong>التكلفة الشهرية:</strong> ${monthlyCost.toFixed(2)} جنيه مصري</p>
            <p><strong>متوسط التكلفة لكل كيلوواط:</strong> ${(monthlyCost / monthlyConsumption).toFixed(2)} جنيه</p>
        </div>
    `;
    
    if (monthlyConsumption > 650) {
        detailsHTML += `
            <div style="margin-top: 15px; padding: 15px; background-color: #FFF3CD; border-radius: var(--border-radius);">
                <p><i class="fas fa-exclamation-triangle"></i> <strong>ملاحظة مهمة:</strong> استهلاكك فوق 650 كيلوواط/ساعة. سيتم خصم 378 ج.م كفرق شرائح.</p>
            </div>
        `;
    }
    
    if (monthlyConsumption > 1000) {
        detailsHTML += `
            <div style="margin-top: 15px; padding: 15px; background-color: #F8D7DA; border-radius: var(--border-radius);">
                <p><i class="fas fa-exclamation-circle"></i> <strong>تحذير:</strong> استهلاكك تجاوز 1000 كيلوواط/ساعة. تم إلغاء الدعم الحكومي وتحاسب بسعر 2.23 جنيه للكيلوواط من الأول.</p>
            </div>
        `;
    }
    
    slabDetails.innerHTML = detailsHTML;
}

function updateRecommendations(monthlyConsumption, remainingDays, currentBalance) {
    const recommendations = document.getElementById('recommendations');
    if (!recommendations) return;
    
    let tips = [];
    
    if (remainingDays < 10) {
        tips.push('<p><i class="fas fa-exclamation-triangle"></i> <strong>رصيدك سينفذ خلال 10 أيام!</strong> يُنصح بشحن العداد بأسرع وقت ممكن.</p>');
    } else if (remainingDays < 20) {
        tips.push(`<p><i class="fas fa-info-circle"></i> <strong>رصيدك يكفي لـ ${remainingDays} يوم.</strong> خطط للشحن القادم خلال الأسبوعين القادمين.</p>`);
    }
    
    if (monthlyConsumption > 650) {
        tips.push('<p><i class="fas fa-lightbulb"></i> <strong>فرصة توفير كبيرة!</strong> تخفيض استهلاكك إلى أقل من 650 كيلوواط/شهر يوفر لك 378 ج.م كفرق شرائح.</p>');
    }
    
    if (monthlyConsumption > 300) {
        tips.push('<p><i class="fas fa-snowflake"></i> <strong>نصيحة:</strong> تقليل استخدام التكييف بساعة يومياً يوفر حوالي 45 كيلوواط شهرياً.</p>');
    }
    
    recommendations.innerHTML = tips.join('');
}

function showResultsSection() {
    const resultsSection = document.getElementById('calculation-results');
    if (resultsSection) {
        resultsSection.style.display = 'block';
        setTimeout(() => {
            resultsSection.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }
}

function updateUserConsumption(data) {
    const consumptionData = {
        ...data,
        lastCalculation: new Date().toISOString()
    };
    
    updateUserConsumptionData(consumptionData);
}

function saveAllData() {
    const currentBalance = parseFloat(document.getElementById('current-balance').value) || 0;
    const appliances = getUserAppliances();
    
    if (currentBalance <= 0) {
        showMessage('يرجى إدخال الرصيد أولاً', 'error');
        return;
    }
    
    if (appliances.length === 0) {
        showMessage('يرجى إضافة أجهزة أولاً', 'error');
        return;
    }
    
    // تأكيد الحفظ
    if (confirm('هل تريد حفظ جميع البيانات الحالية؟')) {
        showMessage('جارٍ حفظ البيانات...', 'info');
        
        setTimeout(() => {
            // إضافة إشعار
            addUserNotification({
                type: 'success',
                title: 'تم حفظ البيانات',
                message: 'تم حفظ جميع بيانات الاستهلاك بنجاح',
                icon: 'fas fa-save'
            });
            
            showMessage('تم حفظ جميع البيانات بنجاح', 'success');
            
            // توجيه إلى لوحة التحكم بعد 2 ثانية
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
        }, 1000);
    }
}

function saveToHistory() {
    const consumptionData = getUserConsumptionData();
    const appliances = getUserAppliances();
    
    if (!consumptionData || consumptionData.balance === 0) {
        showMessage('يرجى إدخال بيانات الاستهلاك أولاً', 'error');
        return;
    }
    
    // إنشاء سجل جديد
    const historyItem = {
        balance: consumptionData.balance,
        dailyConsumption: consumptionData.dailyConsumption,
        monthlyConsumption: consumptionData.monthlyConsumption,
        monthlyCost: consumptionData.monthlyCost,
        currentSlab: consumptionData.currentSlab,
        remainingDays: consumptionData.remainingDays,
        appliancesCount: appliances.length,
        totalPower: appliances.reduce((sum, appliance) => sum + (appliance.power_kw * (appliance.quantity || 1)), 0)
    };
    
    // إضافة للسجل
    const historyId = addUserHistory(historyItem);
    
    if (historyId) {
        // إضافة إشعار
        addUserNotification({
            type: 'info',
            title: 'تم حفظ السجل',
            message: 'تم حفظ بيانات الاستهلاك الحالية في سجلك',
            icon: 'fas fa-history'
        });
        
        showMessage('تم حفظ البيانات في السجل بنجاح', 'success');
    }
}

function resetFormFields() {
    const fields = [
        { id: 'appliance-select', value: '' },
        { id: 'custom-appliance', value: '' },
        { id: 'power-consumption', value: '' },
        { id: 'hours-usage', value: '' },
        { id: 'quantity', value: '1' }
    ];
    
    fields.forEach(field => {
        const element = document.getElementById(field.id);
        if (element) element.value = field.value;
    });
}

function resetForm() {
    resetFormFields();
    
    // إعادة تعيين زر الإضافة إذا كان في وضع التعديل
    const addButton = document.getElementById('add-appliance');
    if (addButton && addButton.dataset.editId) {
        delete addButton.dataset.editId;
        addButton.innerHTML = '<i class="fas fa-plus"></i> إضافة الجهاز';
        addButton.classList.remove('btn-warning');
        addButton.classList.add('btn-primary');
    }
    
    showMessage('تم مسح النموذج', 'info');
}

function showMessage(message, type) {
    // إزالة أي رسائل سابقة
    const existingMessage = document.getElementById('data-entry-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // إنشاء عنصر الرسالة
    const messageDiv = document.createElement('div');
    messageDiv.id = 'data-entry-message';
    messageDiv.className = 'message-alert';
    
    // تخصيص اللون بناءً على النوع
    const colors = {
        'success': '#0f0096',
        'error': '#D32F2F',
        'info': '#1976D2'
    };
    
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        right: 20px;
        padding: 15px;
        border-radius: var(--border-radius);
        color: white;
        font-weight: 600;
        text-align: center;
        z-index: 9999;
        animation: slideDown 0.3s ease;
        background-color: ${colors[type] || '#6c757d'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    messageDiv.textContent = message;
    
    // إضافة الرسالة للصفحة
    document.body.appendChild(messageDiv);
    
    // إزالة الرسالة بعد 3 ثواني
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => messageDiv.remove(), 300);
        }
    }, 3000);
}

// ========== دوال التعامل مع الأجهزة ==========

function editAppliance(applianceId) {
    console.log("تعديل جهاز:", applianceId);
    
    const appliances = getUserAppliances();
    const appliance = appliances.find(a => a.id === applianceId);
    
    if (!appliance) return;
    
    // تعبئة النموذج ببيانات الجهاز
    const fields = [
        { id: 'custom-appliance', value: appliance.name },
        { id: 'power-consumption', value: appliance.power_kw },
        { id: 'hours-usage', value: appliance.hours },
        { id: 'quantity', value: appliance.quantity || 1 }
    ];
    
    fields.forEach(field => {
        const element = document.getElementById(field.id);
        if (element) element.value = field.value;
    });
    
    // تعيين الزر للإضافة مع النص المناسب
    const addButton = document.getElementById('add-appliance');
    if (addButton) {
        addButton.innerHTML = '<i class="fas fa-save"></i> حفظ التعديلات';
        addButton.dataset.editId = applianceId;
        addButton.classList.remove('btn-primary');
        addButton.classList.add('btn-warning');
    }
    
    // تمرير للمقدمة
    const customAppliance = document.getElementById('custom-appliance');
    if (customAppliance) {
        customAppliance.scrollIntoView({ behavior: 'smooth' });
        customAppliance.focus();
    }
    
    showMessage('يمكنك الآن تعديل بيانات الجهاز', 'info');
}

function deleteAppliance(applianceId) {
    if (confirm('هل أنت متأكد من حذف هذا الجهاز؟')) {
        const userId = sessionStorage.getItem('currentUserId');
        if (!userId) return;
        
        const appliancesData = JSON.parse(localStorage.getItem('mowafr_appliances_data') || '{}');
        if (appliancesData[userId]) {
            appliancesData[userId] = appliancesData[userId].filter(appliance => appliance.id !== applianceId);
            localStorage.setItem('mowafr_appliances_data', JSON.stringify(appliancesData));
            
            // إضافة إشعار
            addUserNotification({
                type: 'success',
                title: 'تم حذف الجهاز',
                message: 'تم حذف الجهاز بنجاح من قائمتك',
                icon: 'fas fa-trash'
            });
            
            // تحديث العرض
            updateAppliancesList(appliancesData[userId]);
            
            if (appliancesData[userId].length === 0) {
                showEmptyAppliancesMessage();
            }
            
            showMessage('تم حذف الجهاز بنجاح', 'success');
        }
    }
}

function loadApplianceForEdit(applianceId) {
    const appliances = getUserAppliances();
    const appliance = appliances.find(a => a.id === applianceId);
    
    if (!appliance) return;
    
    editAppliance(applianceId);
}

function updateExistingAppliance(applianceId, updatedData) {
    const userId = sessionStorage.getItem('currentUserId');
    if (!userId) return false;
    
    const appliancesData = JSON.parse(localStorage.getItem('mowafr_appliances_data') || '{}');
    if (appliancesData[userId]) {
        const index = appliancesData[userId].findIndex(a => a.id === applianceId);
        if (index !== -1) {
            appliancesData[userId][index] = {
                ...appliancesData[userId][index],
                ...updatedData,
                lastUpdate: new Date().toISOString()
            };
            
            localStorage.setItem('mowafr_appliances_data', JSON.stringify(appliancesData));
            
            showMessage('تم تحديث بيانات الجهاز بنجاح', 'success');
            
            // إضافة إشعار
            addUserNotification({
                type: 'info',
                title: 'تم تحديث الجهاز',
                message: `تم تحديث بيانات ${updatedData.name}`,
                icon: 'fas fa-edit'
            });
            
            return true;
        }
    }
    
    return false;
}

// ========== دوال مساعدة عامة ==========

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateApplianceId() {
    return 'app_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateHistoryId() {
    return 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateNotificationId() {
    return 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getRandomColor() {
    const colors = ['#0f0096', '#1976D2', '#7B1FA2', '#D32F2F', '#F57C00', '#00796B'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// تحميل بيانات المستخدم في الواجهة
function loadUserData() {
    const user = getCurrentUser();
    if (!user) return;
    
    // تحديث الاسم في الهيدر
    const userElements = document.querySelectorAll('.user-info p:first-child');
    userElements.forEach(element => {
        element.textContent = user.fullName;
    });
    
    // تحديث تاريخ التسجيل
    const joinDateElements = document.querySelectorAll('.user-info p:nth-child(2)');
    if (joinDateElements.length > 0) {
        const joinDate = new Date(user.registrationDate);
        const formattedDate = joinDate.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        joinDateElements[0].innerHTML = `مستخدم منذ: ${formattedDate}`;
    }
    
    // تحديث الصورة الرمزية
    const avatarElements = document.querySelectorAll('.user-avatar');
    avatarElements.forEach(element => {
        element.textContent = user.fullName.charAt(0);
        element.style.backgroundColor = user.profile.avatarColor;
    });
}

function printReport() {
    window.print();
}

// ========== تصدير جميع الدوال للنطاق العام ==========

window.saveBalance = saveBalance;
window.handleAddAppliance = handleAddAppliance;
window.calculateTotalConsumption = calculateTotalConsumption;
window.saveAllData = saveAllData;
window.saveToHistory = saveToHistory;
window.printReport = printReport;
window.resetForm = resetForm;
window.logout = logout;
window.editAppliance = editAppliance;
window.deleteAppliance = deleteAppliance;

window.AuthData = {
    // دوال المصادقة
    handleLogin,
    handleRegister,
    logout,
    checkAuthStatus,
    isLoggedIn,
    getCurrentUser,
    getUserConsumptionData,
    getUserAppliances,
    getUserHistory,
    getUserNotifications,
    updateUserConsumptionData,
    addUserAppliance,
    addUserHistory,
    addUserNotification,
    loadUserData,
    
    // دوال إدخال البيانات
    initDataEntry,
    initializeAllEventListeners,
    saveBalance,
    handleAddAppliance,
    calculateTotalConsumption,
    saveAllData,
    saveToHistory,
    editAppliance,
    deleteAppliance,
    showMessage,
    printReport,
    resetForm
};

window.Auth = window.AuthData;

console.log("تم تحميل نظام المصادقة وإدخال البيانات بنجاح!");