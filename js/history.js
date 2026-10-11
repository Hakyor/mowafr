// إدارة سجل الاستهلاك للمستخدم الحالي
document.addEventListener('DOMContentLoaded', function() {
    if (!window.Auth.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }
    
    // تحميل بيانات المستخدم
    window.Auth.loadUserData();
    
    // تحميل سجل الاستهلاك
    loadConsumptionHistory();
    
    // إعداد مستمعي الأحداث
    setupEventListeners();
    
    // حساب الإحصائيات
    calculateStatistics();
});

function loadConsumptionHistory() {
    const history = window.Auth.getUserHistory();
    const tableBody = document.querySelector('table tbody');
    const totalRecordsElement = document.querySelector('.card-header span');
    
    if (!tableBody || history.length === 0) {
        showEmptyHistoryMessage();
        return;
    }
    
    // تحديث عدد السجلات
    if (totalRecordsElement) {
        totalRecordsElement.textContent = `إجمالي السجلات: ${history.length}`;
    }
    
    // فرز السجلات حسب التاريخ (الأحدث أولاً)
    const sortedHistory = history.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // عرض السجلات (عرض أول 4 فقط)
    const displayHistory = sortedHistory.slice(0, 4);
    let tableHTML = '';
    
    displayHistory.forEach((record, index) => {
        const recordDate = new Date(record.date);
        const formattedDate = recordDate.toLocaleDateString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
        month: 'long',
            day: 'numeric'
        });
        
        // حساب نسبة التغير إذا كان هناك سجل سابق
        let changePercentage = null;
        let changeAmount = null;
        let changeType = 'neutral';
        
        if (index < sortedHistory.length - 1) {
            const prevRecord = sortedHistory[index + 1];
            if (prevRecord.monthlyConsumption > 0) {
                const percentageChange = ((record.monthlyConsumption - prevRecord.monthlyConsumption) / prevRecord.monthlyConsumption) * 100;
                const amountChange = record.monthlyCost - prevRecord.monthlyCost;
                
                changePercentage = Math.abs(percentageChange).toFixed(1);
                changeAmount = Math.abs(amountChange).toFixed(0);
                changeType = percentageChange < 0 ? 'decrease' : 'increase';
            }
        }
        
        // تحديد لون الشريحة
        let slabColor = '#E3F2FD'; // لون افتراضي
        if (record.currentSlab.includes('الخامسة')) slabColor = '#FFF3CD';
        if (record.currentSlab.includes('السادسة')) slabColor = '#FFECB3';
        if (record.currentSlab.includes('السابعة')) slabColor = '#FFCDD2';
        
        tableHTML += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 15px;">
                    <strong>${formattedDate}</strong><br>
                    <small style="color: var(--gray-color);">آخر تحديث</small>
                </td>
                <td style="padding: 15px; text-align: center;">
                    <span style="color: var(--primary-color); font-weight: 600;">${record.balance.toFixed(0)} ج.م</span>
                </td>
                <td style="padding: 15px; text-align: center;">
                    ${record.monthlyConsumption.toFixed(0)} ك.و/س<br>
                    ${changePercentage ? `
                        <small style="color: ${changeType === 'decrease' ? 'var(--success-color)' : 'var(--danger-color)'};">
                            ${changeType === 'decrease' ? '▼' : '▲'} ${changePercentage}%
                        </small>
                    ` : ''}
                </td>
                <td style="padding: 15px; text-align: center;">
                    ${record.monthlyCost.toFixed(0)} ج.م<br>
                    ${changeAmount ? `
                        <small style="color: ${changeType === 'decrease' ? 'var(--success-color)' : 'var(--danger-color)'};">
                            ${changeType === 'decrease' ? '▼' : '▲'} ${changeAmount} ج.م
                        </small>
                    ` : ''}
                </td>
                <td style="padding: 15px; text-align: center;">
                    <span style="background-color: ${slabColor}; padding: 5px 10px; border-radius: 20px;">
                        ${record.currentSlab.split(' ')[0]}
                    </span>
                </td>
                <td style="padding: 15px; text-align: center;">
                    ${record.remainingDays || 0} يوم
                </td>
                <td style="padding: 15px; text-align: center;">
                    <button class="btn btn-secondary" style="padding: 5px 10px;" onclick="viewRecordDetails('${record.id}')" title="عرض التفاصيل">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-primary" style="padding: 5px 10px;" onclick="exportRecord('${record.id}')" title="تصدير">
                        <i class="fas fa-download"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = tableHTML;
    
    // تحديث تذييل الجدول
    updateTableFooter(history.length, displayHistory.length);
}

function showEmptyHistoryMessage() {
    const tableBody = document.querySelector('table tbody');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 50px;">
                    <i class="fas fa-history" style="font-size: 48px; color: var(--gray-color); margin-bottom: 15px;"></i>
                    <h4>لا توجد سجلات</h4>
                    <p>لم تقم بحفظ أي سجلات للاستهلاك بعد</p>
                    <a href="data-entry.html" class="btn btn-primary" style="margin-top: 15px;">
                        <i class="fas fa-plus"></i> إضافة أول سجل
                    </a>
                </td>
            </tr>
        `;
    }
    
    const totalRecordsElement = document.querySelector('.card-header span');
    if (totalRecordsElement) {
        totalRecordsElement.textContent = 'إجمالي السجلات: 0';
    }
}

function updateTableFooter(totalRecords, displayedRecords) {
    const footerElement = document.querySelector('.dashboard-card > div:last-child');
    if (footerElement) {
        footerElement.innerHTML = `
            <div style="padding: 20px; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <p style="color: var(--gray-color);">عرض <strong>1-${displayedRecords}</strong> من <strong>${totalRecords}</strong> سجل</p>
                </div>
                <div>
                    ${totalRecords > displayedRecords ? `
                        <button class="btn btn-secondary" onclick="loadMoreHistory()">
                            <i class="fas fa-arrow-down"></i> تحميل المزيد
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }
}

function calculateStatistics() {
    const history = window.Auth.getUserHistory();
    
    if (history.length === 0) {
        setDefaultStatistics();
        return;
    }
    
    // حساب متوسط الاستهلاك
    const totalConsumption = history.reduce((sum, record) => sum + record.monthlyConsumption, 0);
    const avgConsumption = totalConsumption / history.length;
    
    // حساب متوسط التكلفة
    const totalCost = history.reduce((sum, record) => sum + record.monthlyCost, 0);
    const avgCost = totalCost / history.length;
    
    // العثور على أفضل شهر (أقل استهلاك)
    const bestMonth = history.reduce((best, current) => {
        return current.monthlyConsumption < best.monthlyConsumption ? current : best;
    });
    const bestMonthDate = new Date(bestMonth.date);
    const bestMonthName = bestMonthDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
    
    // تحديث بطاقات الإحصائيات
    updateStatCard(0, avgConsumption.toFixed(0), 'ك.و/س', 'متوسط الاستهلاك');
    updateStatCard(1, avgCost.toFixed(0), 'ج.م', 'متوسط التكلفة');
    updateStatCard(2, bestMonthName, '', 'أفضل شهر');
}

function setDefaultStatistics() {
    updateStatCard(0, '0', 'ك.و/س', 'متوسط الاستهلاك');
    updateStatCard(1, '0', 'ج.م', 'متوسط التكلفة');
    updateStatCard(2, 'لا يوجد', '', 'أفضل شهر');
}

function updateStatCard(index, value, unit, title) {
    const statCards = document.querySelectorAll('.dashboard-grid .dashboard-card');
    if (statCards.length > index) {
        const cardValue = statCards[index].querySelector('.card-value');
        const cardDetails = statCards[index].querySelector('.card-details');
        
        if (cardValue) {
            cardValue.textContent = value;
        }
        
        if (cardDetails) {
            if (index === 0) {
                cardDetails.innerHTML = `
                    <p>متوسط الـ 12 شهراً الماضية</p>
                    <p>الأعلى: ${value} ك.و/س</p>
                `;
            } else if (index === 1) {
                cardDetails.innerHTML = `
                    <p>متوسط التكلفة الشهرية</p>
                    <p>إجمالي العام: ${(parseFloat(value) * 12).toFixed(0)} ج.م</p>
                `;
            } else if (index === 2) {
                cardDetails.innerHTML = `
                    <p>أقل استهلاك</p>
                    <p>توفير: 0 ج.م عن المتوسط</p>
                `;
            }
        }
    }
}

function setupEventListeners() {
    // فلترة السجل
    const applyFiltersBtn = document.getElementById('apply-filters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applyFilters);
    }
    
    // تصدير جميع البيانات
    const exportAllBtn = document.querySelector('button[onclick*="exportAllHistory"]');
    if (exportAllBtn) {
        exportAllBtn.addEventListener('click', exportAllHistory);
    }
    
    // حذف السجلات القديمة
    const clearOldBtn = document.querySelector('button[onclick*="clearOldHistory"]');
    if (clearOldBtn) {
        clearOldBtn.addEventListener('click', clearOldHistory);
    }
}

function applyFilters() {
    const month = document.getElementById('month').value;
    const year = document.getElementById('year').value;
    const sort = document.getElementById('sort').value;
    
    let history = window.Auth.getUserHistory();
    
    // تطبيق الفلاتر
    if (month) {
        history = history.filter(record => {
            const recordDate = new Date(record.date);
            return (recordDate.getMonth() + 1) === parseInt(month);
        });
    }
    
    if (year) {
        history = history.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate.getFullYear() === parseInt(year);
        });
    }
    
    // تطبيق الترتيب
    switch (sort) {
        case 'newest':
            history.sort((a, b) => new Date(b.date) - new Date(a.date));
            break;
        case 'oldest':
            history.sort((a, b) => new Date(a.date) - new Date(b.date));
            break;
        case 'highest':
            history.sort((a, b) => b.monthlyConsumption - a.monthlyConsumption);
            break;
        case 'lowest':
            history.sort((a, b) => a.monthlyConsumption - b.monthlyConsumption);
            break;
    }
    
    // تحديث الجدول
    updateFilteredTable(history);
    
    showMessage(`تم تطبيق الفلاتر على ${history.length} سجل`, 'info');
}

function updateFilteredTable(filteredHistory) {
    const tableBody = document.querySelector('table tbody');
    if (!tableBody || filteredHistory.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 30px; color: var(--gray-color);">
                    <i class="fas fa-search"></i> لا توجد نتائج مطابقة للفلاتر المحددة
                </td>
            </tr>
        `;
        return;
    }
    
    let tableHTML = '';
    
    filteredHistory.forEach((record, index) => {
        const recordDate = new Date(record.date);
        const formattedDate = recordDate.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        tableHTML += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 15px;">
                    <strong>${formattedDate}</strong>
                </td>
                <td style="padding: 15px; text-align: center;">
                    <span style="color: var(--primary-color); font-weight: 600;">${record.balance.toFixed(0)} ج.م</span>
                </td>
                <td style="padding: 15px; text-align: center;">
                    ${record.monthlyConsumption.toFixed(0)} ك.و/س
                </td>
                <td style="padding: 15px; text-align: center;">
                    ${record.monthlyCost.toFixed(0)} ج.م
                </td>
                <td style="padding: 15px; text-align: center;">
                    <span style="background-color: #E3F2FD; padding: 5px 10px; border-radius: 20px;">
                        ${record.currentSlab.split(' ')[0]}
                    </span>
                </td>
                <td style="padding: 15px; text-align: center;">
                    ${record.remainingDays || 0} يوم
                </td>
                <td style="padding: 15px; text-align: center;">
                    <button class="btn btn-secondary" style="padding: 5px 10px;" onclick="viewRecordDetails('${record.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = tableHTML;
}

function viewRecordDetails(recordId) {
    const history = window.Auth.getUserHistory();
    const record = history.find(r => r.id === recordId);
    
    if (!record) {
        alert('السجل غير موجود');
        return;
    }
    
    const recordDate = new Date(record.date);
    const formattedDate = recordDate.toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const detailsHTML = `
        <div style="max-width: 500px;">
            <h3 style="margin-bottom: 20px; color: var(--primary-color);">
                <i class="fas fa-file-alt"></i> تفاصيل السجل
            </h3>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: var(--border-radius);">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <strong>التاريخ:</strong>
                        <p>${formattedDate}</p>
                    </div>
                    <div>
                        <strong>الرصيد:</strong>
                        <p style="color: var(--primary-color); font-weight: 600;">${record.balance.toFixed(0)} ج.م</p>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <strong>الاستهلاك الشهري:</strong>
                        <p>${record.monthlyConsumption.toFixed(2)} ك.و/س</p>
                    </div>
                    <div>
                        <strong>التكلفة الشهرية:</strong>
                        <p>${record.monthlyCost.toFixed(2)} ج.م</p>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <strong>الشريحة:</strong>
                        <p>${record.currentSlab}</p>
                    </div>
                    <div>
                        <strong>الأيام المتبقية:</strong>
                        <p>${record.remainingDays || 0} يوم</p>
                    </div>
                </div>
                
                <div style="margin-top: 20px;">
                    <strong>تفاصيل إضافية:</strong>
                    <p style="margin-top: 5px;">عدد الأجهزة: ${record.appliancesCount || 0}</p>
                    <p>إجمالي الطاقة: ${record.totalPower ? record.totalPower.toFixed(2) + ' ك.و' : 'غير محسوب'}</p>
                </div>
            </div>
            
            <div style="margin-top: 20px; text-align: left;">
                <button onclick="this.parentElement.parentElement.remove()" class="btn btn-secondary">
                    إغلاق
                </button>
                <button onclick="exportRecord('${recordId}')" class="btn btn-primary" style="margin-right: 10px;">
                    <i class="fas fa-download"></i> تصدير
                </button>
            </div>
        </div>
    `;
    
    // إنشاء نافذة عرض
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.cssText = `
        background-color: white;
        padding: 30px;
        border-radius: var(--border-radius);
        box-shadow: var(--box-shadow);
        max-width: 90%;
        max-height: 90%;
        overflow-y: auto;
    `;
    
    modalContent.innerHTML = detailsHTML;
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // إغلاق النافذة عند النقر خارجها
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function exportRecord(recordId) {
    const history = window.Auth.getUserHistory();
    const record = history.find(r => r.id === recordId);
    const user = window.Auth.getCurrentUser();
    
    if (!record || !user) {
        alert('لا يمكن تصدير السجل');
        return;
    }
    
    const recordDate = new Date(record.date);
    const formattedDate = recordDate.toLocaleDateString('ar-EG');
    
    // إنشاء محتوى التقرير
    const reportContent = `
        تقرير استهلاك الكهرباء - موقع مُوفّر
        
        ==========================================
        
        المستخدم: ${user.fullName}
        تاريخ السجل: ${formattedDate}
        
        --------------------------
        
        الرصيد: ${record.balance.toFixed(0)} ج.م
        الاستهلاك الشهري: ${record.monthlyConsumption.toFixed(2)} كيلوواط/ساعة
        التكلفة الشهرية: ${record.monthlyCost.toFixed(2)} ج.م
        الشريحة: ${record.currentSlab}
        الأيام المتبقية: ${record.remainingDays || 0} يوم
        
        --------------------------
        
        عدد الأجهزة: ${record.appliancesCount || 0}
        إجمالي الطاقة: ${record.totalPower ? record.totalPower.toFixed(2) + ' كيلوواط' : 'غير محسوب'}
        
        ==========================================
        
        تم إنشاء هذا التقرير بواسطة موقع مُوفّر
        جميع الحقوق محفوظة © ${new Date().getFullYear()}
    `;
    
    // إنشاء ملف للتحميل
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `سجل_استهلاك_${formattedDate.replace(/\//g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showMessage('تم تصدير السجل بنجاح', 'success');
}

function exportAllHistory() {
    const history = window.Auth.getUserHistory();
    const user = window.Auth.getCurrentUser();
    
    if (!history.length || !user) {
        alert('لا توجد بيانات للتصدير');
        return;
    }
    
    // إنشاء محتوى التقرير
    let reportContent = `تقرير شامل لسجل الاستهلاك - موقع مُوفّر\n\n`;
    reportContent += `المستخدم: ${user.fullName}\n`;
    reportContent += `تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}\n`;
    reportContent += `عدد السجلات: ${history.length}\n`;
    reportContent += `==========================================\n\n`;
    
    history.forEach((record, index) => {
        const recordDate = new Date(record.date);
        const formattedDate = recordDate.toLocaleDateString('ar-EG');
        
        reportContent += `السجل ${index + 1}\n`;
        reportContent += `التاريخ: ${formattedDate}\n`;
        reportContent += `الرصيد: ${record.balance.toFixed(0)} ج.م\n`;
        reportContent += `الاستهلاك: ${record.monthlyConsumption.toFixed(0)} ك.و/س\n`;
        reportContent += `التكلفة: ${record.monthlyCost.toFixed(0)} ج.م\n`;
        reportContent += `الشريحة: ${record.currentSlab.split(' ')[0]}\n`;
        reportContent += `الأيام المتبقية: ${record.remainingDays || 0} يوم\n`;
        reportContent += `------------------------------------------\n\n`;
    });
    
    reportContent += `==========================================\n`;
    reportContent += `تم إنشاء هذا التقرير بواسطة موقع مُوفّر\n`;
    reportContent += `جميع الحقوق محفوظة © ${new Date().getFullYear()}`;
    
    // إنشاء ملف للتحميل
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `سجل_استهلاك_كامل_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showMessage('تم تصدير جميع السجلات بنجاح', 'success');
}

function clearOldHistory() {
    const history = window.Auth.getUserHistory();
    
    if (history.length === 0) {
        alert('لا توجد سجلات قديمة للحذف');
        return;
    }
    
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const oldRecords = history.filter(record => new Date(record.date) < sixMonthsAgo);
    
    if (oldRecords.length === 0) {
        alert('لا توجد سجلات أقدم من 6 أشهر');
        return;
    }
    
    if (!confirm(`هل أنت متأكد من حذف ${oldRecords.length} سجل أقدم من 6 أشهر؟`)) {
        return;
    }
    
    // حذف السجلات القديمة
    const updatedHistory = history.filter(record => new Date(record.date) >= sixMonthsAgo);
    
    // حفظ السجلات المحدثة
    const userId = sessionStorage.getItem('currentUserId');
    if (userId) {
        const historyData = JSON.parse(localStorage.getItem('mowafr_history_data') || '{}');
        historyData[userId] = updatedHistory;
        localStorage.setItem('mowafr_history_data', JSON.stringify(historyData));
        
        // إضافة إشعار
        window.Auth.addUserNotification({
            type: 'info',
            title: 'تم حذف السجلات القديمة',
            message: `تم حذف ${oldRecords.length} سجل أقدم من 6 أشهر`,
            icon: 'fas fa-trash'
        });
        
        // إعادة تحميل الصفحة
        location.reload();
    }
}

function loadMoreHistory() {
    alert('سيتم تطوير هذه الخاصية قريباً لتحميل المزيد من السجلات');
}

function showMessage(message, type) {
    // إزالة أي رسائل سابقة
    const existingMessage = document.getElementById('history-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // إنشاء عنصر الرسالة
    const messageDiv = document.createElement('div');
    messageDiv.id = 'history-message';
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
    `;
    
    // تخصيص اللون بناءً على النوع
    if (type === 'success') {
        messageDiv.style.backgroundColor = 'var(--success-color)';
    } else if (type === 'error') {
        messageDiv.style.backgroundColor = 'var(--danger-color)';
    } else {
        messageDiv.style.backgroundColor = 'var(--primary-color)';
    }
    
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

// إضافة أنيميشن للرسائل
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from { transform: translateY(-100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    @keyframes slideUp {
        from { transform: translateY(0); opacity: 1; }
        to { transform: translateY(-100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// تصدير الدوال
window.HistoryManager = {
    loadConsumptionHistory,
    viewRecordDetails,
    exportRecord,
    exportAllHistory,
    clearOldHistory
};