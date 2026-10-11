// لوحة التحكم - نظام مُوفّر
document.addEventListener('DOMContentLoaded', function() {
    console.log("بدء تحميل لوحة التحكم...");
    
    // التحقق من تسجيل الدخول
    checkLoginStatus();
    
    // تحميل بيانات لوحة التحكم
    loadDashboardData();
    
    // إعداد مستمعي الأحداث
    setupDashboardEventListeners();
    
    // تحديث تلقائي كل 30 ثانية
    setInterval(loadDashboardData, 30000);
    
    // إضافة نمط للرسوم المتحركة إذا لم يكن موجوداً
    addAnimationStyles();
});

// التحقق من حالة تسجيل الدخول
function checkLoginStatus() {
    const currentUserId = sessionStorage.getItem('currentUserId');
    const currentPage = window.location.pathname.split('/').pop();
    
    if (!currentUserId && currentPage === 'dashboard.html') {
        window.location.href = 'login.html';
        return false;
    }
    
    return true;
}

// تحميل بيانات لوحة التحكم
function loadDashboardData() {
    console.log("تحميل بيانات لوحة التحكم...");
    
    // الحصول على بيانات المستخدم
    const user = getCurrentUser();
    const consumptionData = getUserConsumptionData();
    const appliances = getUserAppliances();
    const notifications = getUserNotifications();
    
    // تحديث معلومات المستخدم
    updateUserInfo(user);
    
    // حساب وعرض الأيام المتبقية المتقدمة
    updateAdvancedRemainingDays(consumptionData, appliances);
    
    // تحديث الإحصائيات
    updateStatistics(consumptionData, appliances);
    
    // تحديث قائمة الأجهزة
    updateAppliancesList(appliances);
    
    // تحديث الإشعارات
    updateNotifications(notifications, user);
    
    // تحديث النصائح المتقدمة
    updateTips(consumptionData, appliances);
    
    // تحديث badge إجمالي التوفير
    updateTotalSavingBadge();
    
    console.log("تم تحميل بيانات لوحة التحكم بنجاح");
}

// الحصول على المستخدم الحالي
function getCurrentUser() {
    const userId = sessionStorage.getItem('currentUserId');
    if (!userId) return null;
    
    const users = JSON.parse(localStorage.getItem('mowafr_users') || '[]');
    return users.find(user => user.id === userId);
}

// الحصول على بيانات الاستهلاك
function getUserConsumptionData() {
    const userId = sessionStorage.getItem('currentUserId');
    if (!userId) return null;
    
    const consumptionData = JSON.parse(localStorage.getItem('mowafr_consumption_data') || '{}');
    return consumptionData[userId] || null;
}

// تحديث بيانات الاستهلاك
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

// الحصول على الأجهزة
function getUserAppliances() {
    const userId = sessionStorage.getItem('currentUserId');
    if (!userId) return [];
    
    const appliancesData = JSON.parse(localStorage.getItem('mowafr_appliances_data') || '{}');
    return appliancesData[userId] || [];
}

// الحصول على الإشعارات
function getUserNotifications() {
    const userId = sessionStorage.getItem('currentUserId');
    if (!userId) return [];
    
    const notificationsData = JSON.parse(localStorage.getItem('mowafr_notifications_data') || '{}');
    return notificationsData[userId] || [];
}

// الحصول على سجل الاستهلاك
function getUserHistory() {
    const userId = sessionStorage.getItem('currentUserId');
    if (!userId) return [];
    
    const historyData = JSON.parse(localStorage.getItem('mowafr_history_data') || '{}');
    return historyData[userId] || [];
}

// ==================== دوال الأيام المتبقية المتقدمة ====================

// تحديث الأيام المتبقية باستخدام الآلة الحاسبة المتقدمة
function updateAdvancedRemainingDays(consumptionData, appliances) {
    // التأكد من وجود العناصر في الصفحة
    const remainingDaysNumber = document.getElementById('remaining-days-number');
    const confidenceBadge = document.getElementById('confidence-badge');
    const avgDailyConsumption = document.getElementById('avg-daily-consumption');
    const dailyCost = document.getElementById('daily-cost');
    const daysPercentage = document.getElementById('days-percentage');
    const timelineFill = document.getElementById('timeline-fill');
    const timelineEnd = document.getElementById('timeline-end');
    const progressRingFill = document.querySelector('.progress-ring-fill');
    
    if (!remainingDaysNumber) return; // الصفحة لا تحتوي على عناصر الأيام المتبقية
    
    // إذا لم يكن هناك رصيد أو بيانات
    if (!consumptionData || !consumptionData.balance || consumptionData.balance <= 0) {
        remainingDaysNumber.textContent = '0';
        if (confidenceBadge) confidenceBadge.textContent = 'غير متاح';
        if (avgDailyConsumption) avgDailyConsumption.textContent = '0';
        if (dailyCost) dailyCost.textContent = '0';
        if (daysPercentage) daysPercentage.textContent = '0%';
        if (timelineFill) timelineFill.style.width = '0%';
        if (timelineEnd) timelineEnd.textContent = 'بعد 30 يوم';
        updateProgressRing(progressRingFill, 0);
        return;
    }
    
    // الحصول على التاريخ
    const history = getUserHistory();
    
    // استخدام الآلة الحاسبة المتقدمة
    let result;
    if (window.AdvancedCalculator) {
        result = window.AdvancedCalculator.calculateAccurateRemainingDays(
            consumptionData.balance,
            history,
            appliances
        );
    } else {
        // إذا لم تكن الآلة المتقدمة موجودة، استخدم الطريقة البسيطة
        const monthlyCost = consumptionData.monthlyCost || 
            (window.ElectricityCalculator?.calculateElectricityCost(consumptionData.monthlyConsumption || 300) || 240);
        const days = monthlyCost > 0 ? Math.floor((consumptionData.balance / monthlyCost) * 30) : 0;
        result = {
            days: days,
            confidence: 'تقديرية',
            dailyAverage: consumptionData.dailyConsumption || (consumptionData.monthlyConsumption / 30) || 10,
            dailyCost: monthlyCost / 30
        };
    }
    
    // تحديث الواجهة
    remainingDaysNumber.textContent = result.days;
    
    if (confidenceBadge) {
        confidenceBadge.textContent = result.confidence;
        // تغيير لون badge حسب مستوى الثقة
        confidenceBadge.className = 'confidence-badge';
        if (result.confidence.includes('عالية')) {
            confidenceBadge.classList.add('high-confidence');
        } else if (result.confidence.includes('متوسطة')) {
            confidenceBadge.classList.add('medium-confidence');
        } else {
            confidenceBadge.classList.add('low-confidence');
        }
    }
    
    if (avgDailyConsumption) {
        avgDailyConsumption.textContent = result.dailyAverage.toFixed(1);
    }
    
    if (dailyCost) {
        dailyCost.textContent = result.dailyCost.toFixed(1);
    }
    
    // تحديث النسبة المئوية
    const percentage = Math.min((result.days / 30) * 100, 100);
    if (daysPercentage) {
        daysPercentage.textContent = `${Math.round(percentage)}%`;
    }
    
    // تحديث شريط التقدم
    if (timelineFill) {
        timelineFill.style.width = `${percentage}%`;
    }
    
    if (timelineEnd) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + result.days);
        timelineEnd.textContent = endDate.toLocaleDateString('ar-EG', { 
            day: 'numeric', 
            month: 'short' 
        });
    }
    
    // تحديث الحلقة الدائرية
    updateProgressRing(progressRingFill, percentage);
    
    // حفظ الأيام المتبقية في بيانات المستخدم
    if (consumptionData.remainingDays !== result.days) {
        consumptionData.remainingDays = result.days;
        updateUserConsumptionData({ remainingDays: result.days });
    }
    
    return result;
}

// تحديث الحلقة الدائرية للتقدم
function updateProgressRing(element, percentage) {
    if (!element) return;
    
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    
    element.style.strokeDasharray = `${circumference} ${circumference}`;
    element.style.strokeDashoffset = offset;
}

// ==================== دوال الإحصائيات ====================

// تحديث معلومات المستخدم في الواجهة
function updateUserInfo(user) {
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const userSince = document.getElementById('user-since');
    
    if (!user) {
        if (userAvatar) userAvatar.textContent = '?';
        if (userName) userName.textContent = 'مرحباً';
        if (userSince) userSince.textContent = '...';
        return;
    }
    
    if (userAvatar) {
        userAvatar.textContent = user.fullName.charAt(0);
        userAvatar.style.backgroundColor = user.profile?.avatarColor || '#0f0096';
    }
    
    if (userName) {
        userName.textContent = user.fullName;
    }
    
    if (userSince && user.registrationDate) {
        const joinDate = new Date(user.registrationDate);
        const formattedDate = joinDate.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        userSince.textContent = `مستخدم منذ: ${formattedDate}`;
    }
}

// تحديث الإحصائيات
function updateStatistics(consumptionData, appliances) {
    if (!consumptionData) {
        showDefaultStatistics();
        return;
    }
    
    // حساب الاستهلاك إذا لم يكن موجوداً
    if (!consumptionData.monthlyConsumption && appliances.length > 0) {
        calculateAndUpdateConsumption(consumptionData, appliances);
    }
    
    // تحديث بطاقة الرصيد
    updateBalanceCard(consumptionData);
    
    // تحديث بطاقة الاستهلاك
    updateConsumptionCard(consumptionData);
    
    // تحديث بطاقة التوفير
    updateSavingsCard(consumptionData, appliances);
}

// عرض الإحصائيات الافتراضية
function showDefaultStatistics() {
    // بطاقة الرصيد
    const balanceValue = document.getElementById('current-balance');
    const lastCharge = document.getElementById('last-charge');
    const remainingDaysSpan = document.getElementById('remaining-days');
    
    if (balanceValue) balanceValue.textContent = '0 ج.م';
    if (lastCharge) lastCharge.textContent = 'لم يتم';
    if (remainingDaysSpan) remainingDaysSpan.textContent = 'غير محسوب';
    
    // بطاقة الاستهلاك
    const monthlyConsumption = document.getElementById('monthly-consumption');
    const monthlyCost = document.getElementById('monthly-cost');
    const currentSlab = document.getElementById('current-slab');
    
    if (monthlyConsumption) monthlyConsumption.textContent = '0 ك.و/س';
    if (monthlyCost) monthlyCost.textContent = '0 ج.م';
    if (currentSlab) currentSlab.textContent = 'غير محدد';
    
    // بطاقة التوفير
    const savingsRate = document.getElementById('savings-rate');
    const savingsMessage = document.getElementById('savings-message');
    const savingsAmount = document.getElementById('savings-amount');
    
    if (savingsRate) savingsRate.textContent = '0%';
    if (savingsMessage) savingsMessage.textContent = 'بداية استخدام النظام';
    if (savingsAmount) savingsAmount.textContent = '0 ج.م';
}

// حساب وتحديث بيانات الاستهلاك
function calculateAndUpdateConsumption(consumptionData, appliances) {
    if (!appliances || appliances.length === 0) return;
    
    // حساب الاستهلاك اليومي
    let totalDailyConsumption = 0;
    appliances.forEach(appliance => {
        totalDailyConsumption += (appliance.power_kw || 0) * (appliance.hours || 0) * (appliance.quantity || 1);
    });
    
    // حساب الاستهلاك الشهري
    const monthlyConsumption = totalDailyConsumption * 30;
    
    // حساب التكلفة الشهرية
    const monthlyCost = calculateMonthlyCost(monthlyConsumption);
    
    // تحديد الشريحة
    const currentSlab = getCurrentSlab(monthlyConsumption);
    
    // حساب الأيام المتبقية (سيتم تحديثها لاحقاً بالدالة المتقدمة)
    const remainingDays = consumptionData.balance > 0 && monthlyCost > 0 ? 
        Math.floor((consumptionData.balance / monthlyCost) * 30) : 0;
    
    // تحديث البيانات
    consumptionData.dailyConsumption = totalDailyConsumption;
    consumptionData.monthlyConsumption = monthlyConsumption;
    consumptionData.monthlyCost = monthlyCost;
    consumptionData.currentSlab = currentSlab;
    consumptionData.remainingDays = remainingDays;
    
    // حفظ البيانات المحدثة
    updateUserConsumptionData({
        dailyConsumption: totalDailyConsumption,
        monthlyConsumption: monthlyConsumption,
        monthlyCost: monthlyCost,
        currentSlab: currentSlab,
        remainingDays: remainingDays
    });
}

// حساب التكلفة الشهرية
function calculateMonthlyCost(monthlyConsumption) {
    if (!window.ElectricityCalculator) {
        // حساب مبسط إذا لم يكن calculator.js محملاً
        return monthlyConsumption * 0.8; // سعر افتراضي 0.8 جني للكيلوواط
    }
    
    return window.ElectricityCalculator.calculateElectricityCost(monthlyConsumption);
}

// تحديد الشريحة الحالية
function getCurrentSlab(monthlyConsumption) {
    if (!window.ElectricityCalculator) {
        // شرائح مبسطة
        if (monthlyConsumption <= 50) return 'الشريحة الأولى';
        if (monthlyConsumption <= 100) return 'الشريحة الثانية';
        if (monthlyConsumption <= 200) return 'الشريحة الثالثة';
        if (monthlyConsumption <= 350) return 'الشريحة الرابعة';
        if (monthlyConsumption <= 650) return 'الشريحة الخامسة';
        if (monthlyConsumption <= 1000) return 'الشريحة السادسة';
        return 'الشريحة السابعة';
    }
    
    return window.ElectricityCalculator.getCurrentSlab(monthlyConsumption);
}

// تحديث بطاقة الرصيد
function updateBalanceCard(data) {
    const balanceValue = document.getElementById('current-balance');
    const lastCharge = document.getElementById('last-charge');
    const remainingDaysSpan = document.getElementById('remaining-days');
    
    if (balanceValue) {
        balanceValue.textContent = `${(data.balance || 0).toFixed(0)} ج.م`;
    }
    
    if (lastCharge) {
        const lastUpdate = data.lastUpdate ? new Date(data.lastUpdate).toLocaleDateString('ar-EG') : 'لم يتم';
        lastCharge.textContent = lastUpdate;
    }
    
    if (remainingDaysSpan) {
        remainingDaysSpan.textContent = `${data.remainingDays || 0} يوم`;
    }
}

// تحديث بطاقة الاستهلاك
function updateConsumptionCard(data) {
    const monthlyConsumption = document.getElementById('monthly-consumption');
    const monthlyCost = document.getElementById('monthly-cost');
    const currentSlab = document.getElementById('current-slab');
    
    if (monthlyConsumption) {
        monthlyConsumption.textContent = `${(data.monthlyConsumption || 0).toFixed(0)} ك.و/س`;
    }
    
    if (monthlyCost) {
        monthlyCost.textContent = `${(data.monthlyCost || 0).toFixed(0)} ج.م`;
    }
    
    if (currentSlab) {
        currentSlab.textContent = data.currentSlab || 'غير محدد';
    }
}

// تحديث بطاقة التوفير
function updateSavingsCard(data, appliances) {
    const savingsRate = document.getElementById('savings-rate');
    const savingsMessage = document.getElementById('savings-message');
    const savingsAmount = document.getElementById('savings-amount');
    
    // حساب التوفير
    const savings = calculateSavings(data, appliances);
    
    if (savingsRate) {
        savingsRate.textContent = `${savings.percentage}%`;
    }
    
    if (savingsMessage) {
        savingsMessage.textContent = savings.message;
    }
    
    if (savingsAmount) {
        savingsAmount.textContent = `${savings.amount} ج.م`;
    }
}

// حساب التوفير
function calculateSavings(data, appliances) {
    if (!data || !data.monthlyCost) {
        return {
            percentage: 0,
            amount: 0,
            message: "ابدأ بإدخال أجهزتك"
        };
    }
    
    // حساب توفير افتراضي بناءً على الاستهلاك
    let percentage = 0;
    let amount = 0;
    
    if (data.monthlyConsumption > 650) {
        percentage = 15;
        amount = Math.round(data.monthlyCost * 0.15);
    } else if (data.monthlyConsumption > 350) {
        percentage = 10;
        amount = Math.round(data.monthlyCost * 0.10);
    } else if (data.monthlyConsumption > 100) {
        percentage = 5;
        amount = Math.round(data.monthlyCost * 0.05);
    }
    
    // تحسين الرسالة بناءً على الأجهزة
    let message = percentage > 0 ? `يمكنك توفير ${percentage}%` : "استهلاكك منخفض";
    
    if (appliances && appliances.length > 0) {
        const highConsumption = appliances.filter(a => (a.power_kw || 0) > 1.5);
        if (highConsumption.length > 0 && percentage < 10) {
            message = "ركز على الأجهزة عالية الاستهلاك";
        }
    }
    
    return {
        percentage: percentage,
        amount: amount,
        message: message
    };
}

// ==================== دوال الأجهزة ====================

// تحديث قائمة الأجهزة
function updateAppliancesList(appliances) {
    const appliancesContainer = document.getElementById('appliances-container');
    if (!appliancesContainer) return;
    
    if (!appliances || appliances.length === 0) {
        showEmptyAppliancesMessage();
        return;
    }
    
    let appliancesHTML = '';
    
    // عرض أول 5 أجهزة فقط
    const displayAppliances = appliances.slice(0, 5);
    
    displayAppliances.forEach(appliance => {
        const dailyConsumption = ((appliance.power_kw || 0) * (appliance.hours || 0) * (appliance.quantity || 1)).toFixed(2);
        const monthlyCost = calculateMonthlyCost(dailyConsumption * 30);
        
        appliancesHTML += `
            <div class="appliance-item" id="appliance-${appliance.id}">
                <div class="appliance-info">
                    <h4><i class="fas fa-plug"></i> ${appliance.name}</h4>
                    <div class="appliance-stats">
                        <div class="stat">
                            <span class="stat-label">الاستهلاك</span>
                            <span class="stat-value">${(appliance.power_kw || 0).toFixed(2)} ك.و</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">ساعات التشغيل</span>
                            <span class="stat-value">${appliance.hours || 0} س/يوم</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">العدد</span>
                            <span class="stat-value">${appliance.quantity || 1}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">التكلفة الشهرية</span>
                            <span class="stat-value">${Math.round(monthlyCost)} ج.م</span>
                        </div>
                    </div>
                </div>
                <div class="appliance-actions">
                    <button class="btn btn-secondary" onclick="editAppliance('${appliance.id}')" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="deleteAppliance('${appliance.id}')" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    // إضافة رابط لعرض المزيد إذا كان هناك أكثر من 5 أجهزة
    if (appliances.length > 5) {
        appliancesHTML += `
            <div style="text-align: center; margin-top: 20px;">
                <a href="data-entry.html" class="btn btn-outline-primary">
                    <i class="fas fa-eye"></i> عرض جميع الأجهزة (${appliances.length})
                </a>
            </div>
        `;
    }
    
    appliancesContainer.innerHTML = appliancesHTML;
}

// عرض رسالة عدم وجود أجهزة
function showEmptyAppliancesMessage() {
    const appliancesContainer = document.getElementById('appliances-container');
    if (appliancesContainer) {
        appliancesContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <i class="fas fa-plug" style="font-size: 48px; margin-bottom: 15px; color: #dee2e6;"></i>
                <h4>لا توجد أجهزة مضافة</h4>
                <p>قم بإضافة أجهزتك الكهربائية لبدء تحليل استهلاكك</p>
                <a href="data-entry.html" class="btn btn-primary" style="margin-top: 15px;">
                    <i class="fas fa-plus"></i> إضافة أول جهاز
                </a>
            </div>
        `;
    }
}

// ==================== دوال الإشعارات ====================

// تحديث الإشعارات
function updateNotifications(notifications, user) {
    const alertCard = document.getElementById('welcome-alert');
    if (!alertCard) return;
    
    // تصفية الإشعارات غير المقروءة
    const unreadNotifications = notifications.filter(n => !n.read);
    
    if (unreadNotifications.length > 0) {
        showImportantNotifications(unreadNotifications);
    } else {
        showWelcomeMessage(user);
    }
}

// عرض رسالة الترحيب
function showWelcomeMessage(user) {
    const alertCard = document.getElementById('welcome-alert');
    if (alertCard) {
        const userName = user ? user.fullName : 'عزيزي المستخدم';
        
        alertCard.innerHTML = `
            <div class="card-header">
                <h3><i class="fas fa-info-circle"></i> مرحباً بك في مُوفّر</h3>
            </div>
            <p>أهلاً بك ${userName} في نظام توفير الكهرباء. لبدء الاستخدام:</p>
            <ol style="margin-right: 20px; margin-top: 10px;">
                <li>اذهب إلى صفحة <a href="data-entry.html">إدخال البيانات</a></li>
                <li>أدخل رصيد عدادك الحالي</li>
                <li>أضف أجهزتك الكهربائية</li>
                <li>احصل على تحليل وتوصيات مخصصة</li>
            </ol>
            <div style="text-align: left; margin-top: 15px;">
                <a href="data-entry.html" class="btn btn-primary" style="padding: 5px 15px;">
                    <i class="fas fa-arrow-left"></i> ابدأ الآن
                </a>
            </div>
        `;
    }
}

// عرض الإشعارات المهمة
function showImportantNotifications(notifications) {
    const alertCard = document.getElementById('welcome-alert');
    if (alertCard) {
        let notificationsHTML = '';
        
        // عرض أول 3 إشعارات غير مقروءة فقط
        const displayNotifications = notifications.slice(0, 3);
        
        displayNotifications.forEach(notification => {
            const timeAgo = getTimeAgo(notification.date);
            const icon = getNotificationIcon(notification.type);
            
            notificationsHTML += `
                <div style="padding: 10px; background-color: #f8f9fa; border-radius: 5px; margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                        <i class="${icon}" style="color: #FF9800;"></i>
                        <strong>${notification.title}</strong>
                    </div>
                    <p style="margin: 5px 0; font-size: 14px;">${notification.message}</p>
                    <small style="color: #6c757d;"><i class="fas fa-clock"></i> ${timeAgo}</small>
                </div>
            `;
        });
        
        alertCard.innerHTML = `
            <div class="card-header">
                <h3><i class="fas fa-exclamation-triangle"></i> إشعارات مهمة (${notifications.length})</h3>
            </div>
            ${notificationsHTML}
            <div style="text-align: left; margin-top: 15px;">
                <a href="notifications.html" class="btn btn-secondary" style="padding: 5px 15px;">
                    عرض جميع الإشعارات
                </a>
            </div>
        `;
    }
}

// الحصول على أيقونة الإشعار
function getNotificationIcon(type) {
    const icons = {
        'warning': 'fas fa-exclamation-triangle',
        'danger': 'fas fa-exclamation-circle',
        'success': 'fas fa-check-circle',
        'info': 'fas fa-info-circle',
        'tip': 'fas fa-lightbulb',
        'default': 'fas fa-bell'
    };
    
    return icons[type] || icons.default;
}

// حساب الوقت المنقضي
function getTimeAgo(dateString) {
    if (!dateString) return 'منذ فترة';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `قبل ${diffMins} دقيقة`;
    if (diffHours < 24) return `قبل ${diffHours} ساعة`;
    if (diffDays < 30) return `قبل ${diffDays} يوم`;
    
    return date.toLocaleDateString('ar-EG');
}

// ==================== دوال النصائح المتقدمة ====================

// تحديث النصائح - نسخة متقدمة مخصصة
function updateTips(consumptionData, appliances) {
    const tipsContainer = document.getElementById('tips-container');
    if (!tipsContainer) return;
    
    let tipsHTML = '';
    
    // إذا لم تكن هناك أجهزة
    if (!appliances || appliances.length === 0) {
        tipsHTML = `
            <div style="padding: 25px; background: linear-gradient(135deg, #f5f7fa 0%, #e8f5e9 100%); border-radius: 15px; text-align: center;">
                <i class="fas fa-plug" style="font-size: 48px; color: #0f0096; margin-bottom: 15px;"></i>
                <h3 style="color: #0f0096; margin-bottom: 10px;">ابدأ رحلة التوفير</h3>
                <p style="color: #555; margin-bottom: 20px;">أضف أجهزتك الكهربائية للحصول على خطة توفير مخصصة بالكامل</p>
                <a href="data-entry.html" class="btn btn-primary">
                    <i class="fas fa-plus"></i> إضافة الأجهزة
                </a>
            </div>
        `;
        tipsContainer.innerHTML = tipsHTML;
        return;
    }
    
    // استخدام المُحسّن الشخصي
    if (window.PersonalSavingOptimizer) {
        const analysis = window.PersonalSavingOptimizer.analyzeSavingOpportunities(appliances, consumptionData);
        const plan = window.PersonalSavingOptimizer.generateSavingPlan(appliances, consumptionData);
        
        // عرض إجمالي التوفير المحتمل
        tipsHTML = `
            <div style="margin-bottom: 25px; padding: 20px; background: linear-gradient(135deg, #0f0096 0%, #66BB6A 100%); border-radius: 15px; color: white;">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 20px;">
                    <div>
                        <h3 style="color: white; margin-bottom: 10px;"><i class="fas fa-chart-line"></i> إجمالي التوفير المحتمل</h3>
                        <p style="font-size: 2.5rem; font-weight: 700; margin: 0;">${analysis.totalPotentialSaving} ج.م</p>
                        <p style="opacity: 0.9;">شهرياً</p>
                    </div>
                    <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 12px;">
                        <p style="margin: 0;"><i class="fas fa-bolt"></i> ${analysis.opportunities.length} فرصة توفير</p>
                        <p style="margin: 5px 0 0;"><i class="fas fa-clock"></i> ${plan.quickWins.length} فرصة سريعة</p>
                    </div>
                </div>
            </div>
        `;
        
        // عرض خطة التوفير المتدرجة
        
        // 1. المكاسب السريعة
        if (plan.quickWins.length > 0) {
            tipsHTML += `
                <div style="margin-bottom: 20px;">
                    <h4 style="color: #0f0096; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                        <span style="background: #0f0096; color: white; width: 25px; height: 25px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 14px;">1</span>
                        مكاسب سريعة (فوري)
                    </h4>
            `;
            
            plan.quickWins.forEach(opp => {
                tipsHTML += renderSavingOpportunity(opp);
            });
            
            tipsHTML += `</div>`;
        }
        
        // 2. تغيير العادات
        if (plan.mediumEffort.length > 0) {
            tipsHTML += `
                <div style="margin-bottom: 20px;">
                    <h4 style="color: #FF9800; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                        <span style="background: #FF9800; color: white; width: 25px; height: 25px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 14px;">2</span>
                        تغيير عادات (خلال أسبوع)
                    </h4>
            `;
            
            plan.mediumEffort.forEach(opp => {
                tipsHTML += renderSavingOpportunity(opp);
            });
            
            tipsHTML += `</div>`;
        }
        
        // 3. استثمارات
        if (plan.highEffort.length > 0) {
            tipsHTML += `
                <div style="margin-bottom: 20px;">
                    <h4 style="color: #D32F2F; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                        <span style="background: #D32F2F; color: white; width: 25px; height: 25px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 14px;">3</span>
                        استثمارات طويلة المدى
                    </h4>
            `;
            
            plan.highEffort.forEach(opp => {
                tipsHTML += renderSavingOpportunity(opp);
            });
            
            tipsHTML += `</div>`;
        }
        
        // إضافة شريط التقدم للتوفير
        if (consumptionData && consumptionData.monthlyCost > 0) {
            const savingPercentage = Math.min((analysis.totalPotentialSaving / consumptionData.monthlyCost) * 100, 100);
            
            tipsHTML += `
                <div style="margin-top: 25px; padding: 20px; background-color: #f8f9fa; border-radius: 12px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span>نسبة التوفير المحتمل</span>
                        <span style="font-weight: 600; color: #0f0096;">${savingPercentage.toFixed(1)}%</span>
                    </div>
                    <div style="width: 100%; height: 12px; background-color: #e0e0e0; border-radius: 6px; overflow: hidden;">
                        <div style="width: ${savingPercentage}%; height: 100%; background: linear-gradient(90deg, #0f0096, #66BB6A); border-radius: 6px;"></div>
                    </div>
                    <p style="margin-top: 15px; font-size: 14px; color: #666;">
                        <i class="fas fa-info-circle"></i> بتطبيق هذه الاقتراحات، يمكنك توفير ما يعادل فاتورة شهر ونصف سنوياً
                    </p>
                </div>
            `;
        }
        
        tipsContainer.innerHTML = tipsHTML;
    } else {
        // Fallback للنصائح العامة إذا لم يتم تحميل المُحسّن
        showGeneralTips(tipsContainer);
    }
}

// دالة مساعدة لعرض فرصة التوفير
function renderSavingOpportunity(opp) {
    let bgColor = '#E8F5E9';
    let borderColor = '#0f0096';
    let icon = 'fas fa-lightbulb';
    
    if (opp.type === 'high_consumption') {
        bgColor = '#FFF3CD';
        borderColor = '#FF9800';
        icon = 'fas fa-exclamation-triangle';
    } else if (opp.type === 'slab') {
        bgColor = '#E3F2FD';
        borderColor = '#1976D2';
        icon = 'fas fa-trophy';
    } else if (opp.type === 'peak') {
        bgColor = '#F3E5F5';
        borderColor = '#7B1FA2';
        icon = 'fas fa-clock';
    }
    
    return `
        <div style="padding: 18px; background-color: ${bgColor}; border-right: 5px solid ${borderColor}; border-radius: 12px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 15px;">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <i class="${icon}" style="color: ${borderColor};"></i>
                        <strong style="color: ${borderColor};">${opp.title}</strong>
                    </div>
                    <p style="margin-bottom: 10px; color: #333;">${opp.description}</p>
                    
                    <div style="display: flex; gap: 15px; font-size: 14px;">
                        <span style="color: #666;">
                            <i class="fas fa-bolt"></i> الاستهلاك الحالي: ${opp.currentConsumption || ''} ك.و/س
                        </span>
                        <span style="color: #666;">
                            <i class="fas fa-money-bill"></i> التكلفة: ${opp.currentCost || ''} ج.م
                        </span>
                    </div>
                </div>
                
                <div style="background-color: ${borderColor}; color: white; padding: 10px 15px; border-radius: 25px; font-weight: 700; min-width: 80px; text-align: center;">
                    <span style="font-size: 12px;">توفير</span>
                    <span style="font-size: 18px; display: block;">${opp.saving} ج.م</span>
                </div>
            </div>
            
            <!-- زر تطبيق الاقتراح -->
            <div style="margin-top: 15px; display: flex; gap: 10px; align-items: center;">
                <button onclick="trackSaving('${opp.applianceId}', ${opp.saving})" class="btn btn-secondary" style="padding: 5px 15px; font-size: 13px;">
                    <i class="fas fa-check"></i> سأطبق هذا
                </button>
                <span style="font-size: 12px; color: #666;">
                    <i class="far fa-clock"></i> ${opp.priority === 'critical' ? 'ضروري' : opp.priority === 'high' ? 'مهم' : 'اختياري'}
                </span>
            </div>
        </div>
    `;
}

// دالة لتتبع تطبيق الاقتراحات
function trackSaving(applianceId, savingAmount) {
    const userId = sessionStorage.getItem('currentUserId');
    if (!userId) return;
    
    // حفظ في الإشعارات أن المستوى طبق اقتراحاً
    const notificationsData = JSON.parse(localStorage.getItem('mowafr_notifications_data') || '{}');
    if (!notificationsData[userId]) {
        notificationsData[userId] = [];
    }
    
    notificationsData[userId].push({
        id: 'notif_' + Date.now(),
        type: 'success',
        title: 'اقتراح مطبق!',
        message: `تم تطبيق اقتراح توفير بقيمة ${savingAmount} ج.م. استمر في التوفير!`,
        date: new Date().toISOString(),
        read: false,
        icon: 'fas fa-check-circle'
    });
    
    localStorage.setItem('mowafr_notifications_data', JSON.stringify(notificationsData));
    
    alert(`✅ تم تسجيل تطبيقك لهذا الاقتراح! سنتابع معك التوفير المحقق.`);
}

// دالة احتياطية للنصائح العامة
function showGeneralTips(container) {
    container.innerHTML = `
        <div style="padding: 20px; background: linear-gradient(135deg, #f5f7fa 0%, #e3f2fd 100%); border-radius: 12px;">
            <h4 style="color: #1976D2; margin-bottom: 15px;"><i class="fas fa-info-circle"></i> نصائح عامة</h4>
            <ul style="list-style: none; padding: 0;">
                <li style="margin-bottom: 10px;"><i class="fas fa-check-circle" style="color: #1976D2;"></i> افصل الأجهزة عند عدم استخدامها</li>
                <li style="margin-bottom: 10px;"><i class="fas fa-check-circle" style="color: #1976D2;"></i> استخدم لمبات LED موفرة</li>
                <li style="margin-bottom: 10px;"><i class="fas fa-check-circle" style="color: #1976D2;"></i> نظف فلاتر التكييف باستمرار</li>
            </ul>
        </div>
    `;
}

// تحديث badge إجمالي التوفير
function updateTotalSavingBadge() {
    const badge = document.getElementById('total-saving-potential');
    const appliances = getUserAppliances();
    const consumptionData = getUserConsumptionData();
    
    if (window.PersonalSavingOptimizer && badge) {
        const analysis = window.PersonalSavingOptimizer.analyzeSavingOpportunities(appliances, consumptionData);
        badge.textContent = analysis.totalPotentialSaving;
    }
}

// ==================== دوال الأحداث والإجراءات ====================

// إعداد مستمعي الأحداث
function setupDashboardEventListeners() {
    console.log("إعداد مستمعي الأحداث للوحة التحكم...");
    
    // ربط زر تسجيل الخروج
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            logoutUser();
        });
    }
    
    // ربط زر تحديث البيانات (إذا كان موجوداً)
    const refreshBtn = document.getElementById('refresh-dashboard');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            loadDashboardData();
            showMessage('تم تحديث البيانات', 'success');
        });
    }
    
    // ربط زر إضافة جهاز
    const addDeviceBtn = document.querySelector('a.btn-primary[href="data-entry.html"]');
    if (addDeviceBtn) {
        addDeviceBtn.addEventListener('click', function(e) {
            // تأكد من تسجيل الدخول
            if (!sessionStorage.getItem('currentUserId')) {
                e.preventDefault();
                window.location.href = 'login.html';
            }
        });
    }
}

// تسجيل خروج المستخدم
async function logoutUser() {
    sessionStorage.removeItem('editApplianceId');
    try { await MowafrAPI.flush(); } catch (e) {}
    await MowafrAPI.logout();
    window.location.href = 'index.html';
}

// دوال التعامل مع الأجهزة
function editAppliance(applianceId) {
    console.log("تعديل جهاز:", applianceId);
    
    // حفظ معرف الجهاز للتعديل
    sessionStorage.setItem('editApplianceId', applianceId);
    
    // توجيه إلى صفحة إدخال البيانات
    window.location.href = 'data-entry.html';
}

function deleteAppliance(applianceId) {
    if (confirm('هل أنت متأكد من حذف هذا الجهاز؟')) {
        console.log("حذف جهاز:", applianceId);
        
        const userId = sessionStorage.getItem('currentUserId');
        if (!userId) {
            showMessage('يجب تسجيل الدخول أولاً', 'error');
            return;
        }
        
        // الحصول على بيانات الأجهزة
        const appliancesData = JSON.parse(localStorage.getItem('mowafr_appliances_data') || '{}');
        if (appliancesData[userId]) {
            // تصفية الجهاز المراد حذفه
            const originalLength = appliancesData[userId].length;
            appliancesData[userId] = appliancesData[userId].filter(appliance => appliance.id !== applianceId);
            
            // التحقق من نجاح الحذف
            if (appliancesData[userId].length < originalLength) {
                // حفظ البيانات المحدثة
                localStorage.setItem('mowafr_appliances_data', JSON.stringify(appliancesData));
                
                // إضافة إشعار
                const notificationsData = JSON.parse(localStorage.getItem('mowafr_notifications_data') || '{}');
                if (!notificationsData[userId]) {
                    notificationsData[userId] = [];
                }
                
                notificationsData[userId].push({
                    id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    type: 'success',
                    title: 'تم حذف الجهاز',
                    message: 'تم حذف الجهاز بنجاح من قائمتك',
                    date: new Date().toISOString(),
                    read: false,
                    icon: 'fas fa-trash'
                });
                
                localStorage.setItem('mowafr_notifications_data', JSON.stringify(notificationsData));
                
                // إعادة تحميل الصفحة بعد نصف ثانية
                setTimeout(() => {
                    location.reload();
                }, 500);
                
                showMessage('تم حذف الجهاز بنجاح', 'success');
            } else {
                showMessage('لم يتم العثور على الجهاز', 'error');
            }
        }
    }
}

// عرض رسالة
function showMessage(message, type) {
    // إزالة أي رسائل سابقة
    const existingMessage = document.getElementById('dashboard-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // إنشاء عنصر الرسالة
    const messageDiv = document.createElement('div');
    messageDiv.id = 'dashboard-message';
    
    // تحديد اللون بناءً على النوع
    let backgroundColor = '#6c757d'; // رمادي افتراضي
    if (type === 'success') backgroundColor = '#0f0096';
    else if (type === 'error') backgroundColor = '#D32F2F';
    else if (type === 'info') backgroundColor = '#1976D2';
    else if (type === 'warning') backgroundColor = '#F57C00';
    
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        right: 20px;
        padding: 15px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        text-align: center;
        z-index: 9999;
        animation: slideDown 0.3s ease;
        background-color: ${backgroundColor};
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

// إضافة أنماط CSS للرسوم المتحركة
function addAnimationStyles() {
    // التحقق من وجود الأنماط مسبقاً
    if (document.getElementById('dashboard-animation-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'dashboard-animation-styles';
    style.textContent = `
        @keyframes slideDown {
            from { transform: translateY(-100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideUp {
            from { transform: translateY(0); opacity: 1; }
            to { transform: translateY(-100%); opacity: 0; }
        }
        
        .confidence-badge {
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            color: white;
        }
        
        .confidence-badge.high-confidence {
            background-color: #0f0096;
        }
        
        .confidence-badge.medium-confidence {
            background-color: #FF9800;
        }
        
        .confidence-badge.low-confidence {
            background-color: #F57C00;
        }
        
        .btn-outline-primary {
            background-color: transparent;
            border: 2px solid var(--primary-color);
            color: var(--primary-color);
            padding: 8px 20px;
            border-radius: var(--border-radius);
            text-decoration: none;
            transition: all 0.3s ease;
        }
        
        .btn-outline-primary:hover {
            background-color: var(--primary-color);
            color: white;
        }
        
        .progress-ring-fill {
            transition: stroke-dashoffset 1s ease-in-out;
        }
    `;
    document.head.appendChild(style);
}

// ==================== دوال مساعدة إضافية ====================

// تحديث يدوي للأيام المتبقية (يمكن استدعاؤها من الخارج)
function refreshRemainingDays() {
    const consumptionData = getUserConsumptionData();
    const appliances = getUserAppliances();
    return updateAdvancedRemainingDays(consumptionData, appliances);
}

// حساب إجمالي الاستهلاك اليومي
function calculateTotalDailyConsumption(appliances) {
    if (!appliances || appliances.length === 0) return 0;
    
    return appliances.reduce((total, app) => {
        return total + ((app.power_kw || 0) * (app.hours || 0) * (app.quantity || 1));
    }, 0);
}

// الحصول على توقعات الشهر القادم
function getNextMonthPrediction() {
    const history = getUserHistory();
    const appliances = getUserAppliances();
    
    if (window.ConsumptionPredictor) {
        return window.ConsumptionPredictor.predictNextMonth(history, appliances);
    }
    
    return null;
}

// ==================== تصدير الدوال ====================

// تعريف الدوال في النطاق العام
window.editAppliance = editAppliance;
window.deleteAppliance = deleteAppliance;
window.refreshRemainingDays = refreshRemainingDays;
window.trackSaving = trackSaving;

// تصدير كائن Dashboard للاستخدام في ملفات أخرى
window.Dashboard = {
    loadDashboardData,
    editAppliance,
    deleteAppliance,
    showMessage,
    updateUserInfo,
    logoutUser,
    refreshRemainingDays,
    getNextMonthPrediction,
    calculateTotalDailyConsumption,
    trackSaving
};

console.log("تم تحميل لوحة التحكم بنجاح مع دعم التوفير الشخصي المتقدم!");