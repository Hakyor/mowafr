// بيانات شرائح الكهرباء 2026
const electricityTariffs = [
    { min: 0, max: 50, price: 0.68, name: "الأولى" },
    { min: 51, max: 100, price: 0.78, name: "الثانية" },
    { min: 0, max: 200, price: 0.95, name: "الثالثة", cumulative: true },
    { min: 201, max: 350, price: 1.55, name: "الرابعة" },
    { min: 351, max: 650, price: 1.95, name: "الخامسة" },
    { min: 651, max: 1000, price: 2.10, name: "السادسة", discount: 378 },
    { min: 1001, max: Infinity, price: 2.23, name: "السابعة", noSupport: true }
];

// أجهزة نموذجية مع استهلاك تقريبي
const defaultAppliances = [
    { id: 1, name: "تكييف (1.5 طن)", power_kw: 1.5, category: "تبريد" },
    { id: 2, name: "ثلاجة متوسطة", power_kw: 0.2, category: "أساسي" },
    { id: 3, name: "غسالة أتوماتيك", power_kw: 0.5, category: "غسيل" },
    { id: 4, name: "تلفزيون LED", power_kw: 0.1, category: "ترفيه" },
    { id: 5, name: "سخان مياه", power_kw: 2.0, category: "تسخين" },
    { id: 6, name: "مروحة سقف", power_kw: 0.075, category: "تبريد" },
    { id: 7, name: "مكواة", power_kw: 1.0, category: "كوي" },
    { id: 8, name: "مايكروويف", power_kw: 0.8, category: "مطبخ" },
    { id: 9, name: "كمبيوتر مكتبي", power_kw: 0.15, category: "عمل" },
    { id: 10, name: "لمبة LED", power_kw: 0.01, category: "إضاءة" }
];

// الحاسبة السريعة للصفحة الرئيسية
document.addEventListener('DOMContentLoaded', function() {
    const quickCalculateBtn = document.getElementById('quick-calculate');
    
    if (quickCalculateBtn) {
        quickCalculateBtn.addEventListener('click', calculateQuickEstimation);
    }
});

function calculateQuickEstimation() {
    const balance = parseFloat(document.getElementById('balance').value) || 0;
    const monthlyConsumption = parseFloat(document.getElementById('consumption').value) || 0;
    
    if (balance <= 0 || monthlyConsumption <= 0) {
        alert("يرجى إدخال قيم صحيحة");
        return;
    }
    
    // حساب التكلفة الشهرية
    const monthlyCost = calculateElectricityCost(monthlyConsumption);
    
    // حساب عدد الأيام المتبقية
    const daysLeft = monthlyCost > 0 ? Math.floor((balance / monthlyCost) * 30) : 0;
    
    // تحديد الشريحة
    const currentSlab = getCurrentSlab(monthlyConsumption);
    
    // عرض النتائج
    const quickResult = document.getElementById('quick-result');
    if (quickResult) {
        document.getElementById('days-left').textContent = daysLeft;
        document.getElementById('monthly-cost').textContent = monthlyCost.toFixed(2);
        document.getElementById('current-slab').textContent = currentSlab;
        
        quickResult.style.display = 'block';
        
        // نصائح بناءً على النتائج
        showQuickTips(daysLeft, monthlyConsumption);
    }
}

function calculateElectricityCost(kwh) {
    if (kwh <= 0) return 0;
    
    let totalCost = 0;
    let remainingKwh = kwh;
    
    // معالجة الشرائح التراكمية
    const cumulativeSlab = electricityTariffs.find(slab => slab.cumulative);
    if (cumulativeSlab && kwh <= cumulativeSlab.max) {
        return kwh * cumulativeSlab.price;
    }
    
    // إلغاء الدعم للشريحة السابعة (تحاسب من الصفر)
    if (kwh > 1000) {
        const slab7 = electricityTariffs.find(slab => slab.noSupport);
        return kwh * slab7.price;
    }
    
    // حساب كل شريحة
    for (let i = 0; i < electricityTariffs.length && remainingKwh > 0; i++) {
        const slab = electricityTariffs[i];
        
        if (slab.cumulative || slab.noSupport) continue;
        
        let slabKwh = 0;
        
        if (slab.min === 0) {
            // أول شريحة
            slabKwh = Math.min(slab.max, remainingKwh);
        } else {
            slabKwh = Math.min(slab.max - slab.min, remainingKwh);
        }
        
        if (slabKwh > 0) {
            totalCost += slabKwh * slab.price;
            remainingKwh -= slabKwh;
        }
        
        // خصم فرق الشرائح للشريحة السادسة
        if (slab.discount && kwh > 650) {
            totalCost -= slab.discount;
            if (totalCost < 0) totalCost = 0;
        }
    }
    
    return totalCost;
}

function getCurrentSlab(kwh) {
    if (kwh <= 50) return "الشريحة الأولى";
    if (kwh <= 100) return "الشريحة الثانية";
    if (kwh <= 200) return "الشريحة الثالثة";
    if (kwh <= 350) return "الشريحة الرابعة";
    if (kwh <= 650) return "الشريحة الخامسة";
    if (kwh <= 1000) return "الشريحة السادسة (خصم 378 ج.م)";
    return "الشريحة السابعة (إلغاء دعم)";
}

function showQuickTips(daysLeft, consumption) {
    const tips = [];
    
    if (daysLeft < 15) {
        tips.push("⚠️ رصيدك سينفذ قريباً! يُنصح بشحن العداد فوراً.");
    }
    
    if (consumption > 650) {
        tips.push("💡 استهلاكك مرتفع. تخفيض 50 كيلوواط يوفر لك 378 ج.م فرق شرائح!");
    }
    
    if (consumption > 1000) {
        tips.push("🚨 استهلاكك تجاوز 1000 كيلوواط! أنت الآن بدون دعم حكومي.");
    }
    
    if (consumption > 300) {
        tips.push("🔌 حاول تقليل استخدام التكييف والأجهزة عالية الاستهلاك في ساعات الذروة.");
    }
    
    if (tips.length > 0) {
        console.log("نصائح:", tips.join("\n"));
    }
}

// حساب الاستهلاك اليومي بناءً على الأجهزة
function calculateDailyConsumption(appliances) {
    if (!appliances || !Array.isArray(appliances) || appliances.length === 0) return 0;
    
    return appliances.reduce((total, appliance) => {
        const quantity = appliance.quantity || 1;
        return total + (appliance.power_kw * appliance.hours * quantity);
    }, 0);
}

// حساب الاستهلاك الشهري
function calculateMonthlyConsumption(dailyConsumption) {
    return dailyConsumption * 30;
}

// تقدير الرصيد المتبقي بالأيام
function estimateRemainingDays(balance, monthlyCost) {
    if (monthlyCost <= 0 || balance <= 0) return 0;
    return Math.floor((balance / monthlyCost) * 30);
}

// حساب التوفير المحتمل
function calculatePotentialSavings(currentConsumption, targetConsumption) {
    const currentCost = calculateElectricityCost(currentConsumption);
    const targetCost = calculateElectricityCost(targetConsumption);
    const savings = currentCost - targetCost;
    
    return {
        amount: savings,
        percentage: ((savings / currentCost) * 100).toFixed(1),
        message: savings > 0 ? `يمكنك توفير ${savings.toFixed(2)} ج.م شهرياً` : 'لا يوجد توفير محتمل'
    };
}

// تحليل الأجهزة عالية الاستهلاك
function analyzeHighConsumptionAppliances(appliances) {
    if (!appliances || appliances.length === 0) return [];
    
    // حساب الاستهلاك اليومي لكل جهاز
    const appliancesWithDailyConsumption = appliances.map(appliance => ({
        ...appliance,
        dailyConsumption: appliance.power_kw * appliance.hours * (appliance.quantity || 1)
    }));
    
    // ترتيب تنازلي حسب الاستهلاك
    return appliancesWithDailyConsumption.sort((a, b) => b.dailyConsumption - a.dailyConsumption);
}

// توليد توصيات مخصصة
function generateRecommendations(consumptionData, appliances) {
    const recommendations = [];
    
    if (consumptionData && consumptionData.remainingDays < 15) {
        recommendations.push({
            type: 'warning',
            title: 'رصيد منخفض',
            message: `رصيدك يكفي لـ ${consumptionData.remainingDays} يوم فقط. يُنصح بشحن العداد قريباً.`,
            priority: 1
        });
    }
    
    if (consumptionData && consumptionData.monthlyConsumption > 650) {
        recommendations.push({
            type: 'opportunity',
            title: 'فرصة توفير كبيرة',
            message: 'تخفيض استهلاكك إلى أقل من 650 كيلوواط/شهر يوفر 378 ج.م كفرق شرائح.',
            priority: 2
        });
    }
    
    // تحليل الأجهزة عالية الاستهلاك
    const highConsumptionAppliances = analyzeHighConsumptionAppliances(appliances);
    if (highConsumptionAppliances.length > 0) {
        const topAppliance = highConsumptionAppliances[0];
        if (topAppliance.dailyConsumption > 5) {
            recommendations.push({
                type: 'suggestion',
                title: 'جهاز عالي الاستهلاك',
                message: `${topAppliance.name} يمثل استهلاكاً عالياً. حاول تقليل ساعات تشغيله.`,
                priority: 3
            });
        }
    }
    
    // توصيات عامة
    recommendations.push({
        type: 'tip',
        title: 'نصيحة عامة',
        message: 'استبدال اللمبات التقليدية بلمبات LED يوفر 30 كيلوواط شهرياً.',
        priority: 4
    });
    
    // ترتيب حسب الأولوية
    return recommendations.sort((a, b) => a.priority - b.priority);
}

// إنشاء تقرير تحليلي
function generateAnalysisReport(userData, appliances, consumptionData) {
    const dailyConsumption = calculateDailyConsumption(appliances);
    const monthlyConsumption = calculateMonthlyConsumption(dailyConsumption);
    const monthlyCost = calculateElectricityCost(monthlyConsumption);
    const remainingDays = consumptionData && consumptionData.balance ? 
        estimateRemainingDays(consumptionData.balance, monthlyCost) : 0;
    const currentSlab = getCurrentSlab(monthlyConsumption);
    
    const report = {
        userInfo: {
            name: userData.fullName,
            email: userData.email,
            registrationDate: userData.registrationDate
        },
        summary: {
            balance: consumptionData ? consumptionData.balance : 0,
            dailyConsumption: dailyConsumption,
            monthlyConsumption: monthlyConsumption,
            monthlyCost: monthlyCost,
            currentSlab: currentSlab,
            remainingDays: remainingDays
        },
        appliances: {
            count: appliances.length,
            totalPower: appliances.reduce((sum, appliance) => sum + (appliance.power_kw * (appliance.quantity || 1)), 0),
            highConsumption: analyzeHighConsumptionAppliances(appliances).slice(0, 3)
        },
        recommendations: generateRecommendations({
            ...consumptionData,
            monthlyConsumption: monthlyConsumption,
            remainingDays: remainingDays
        }, appliances)
    };
    
    return report;
}

// ==================== الآلة الحاسبة المتقدمة ====================

const AdvancedConsumptionCalculator = {
    // حساب دقيق للأيام المتبقية باستخدام المتوسط المتحرك
    calculateAccurateRemainingDays(balance, history, appliances) {
        if (!balance || balance <= 0) return { days: 0, confidence: 'لا يوجد رصيد', dailyAverage: 0, dailyCost: 0 };
        
        // 1. إذا كان هناك تاريخ استهلاك، استخدم المتوسط المتحرك
        if (history && history.length > 0) {
            return this.calculateFromHistory(balance, history);
        }
        
        // 2. إذا لم يكن هناك تاريخ، قدر من الأجهزة
        if (appliances && appliances.length > 0) {
            return this.estimateFromAppliances(balance, appliances);
        }
        
        // 3. إذا لم يكن هناك بيانات، أرجع 0
        return { days: 0, confidence: 'لا توجد بيانات', dailyAverage: 0, dailyCost: 0 };
    },

    calculateFromHistory(balance, history) {
        // 1. حساب المتوسط المتحرك لآخر 7 أيام
        const dailyAverage = this.calculateMovingAverage(history);
        if (dailyAverage <= 0) {
            return { days: 0, confidence: 'بيانات غير كافية', dailyAverage: 0, dailyCost: 0 };
        }
        
        // 2. تصحيح موسمي (أيام الأسبوع)
        const seasonalAdjustment = this.getSeasonalAdjustment();
        
        // 3. توقع الاستهلاك للأيام القادمة
        const predictedDailyConsumption = dailyAverage * seasonalAdjustment;
        
        // 4. حساب التكلفة اليومية
        const dailyCost = this.calculateDailyCost(predictedDailyConsumption);
        
        // 5. الأيام المتبقية مع مراعاة الشرائح
        const remainingDays = this.calculateDaysWithSlabs(balance, dailyCost, history);
        
        return {
            days: Math.floor(remainingDays),
            confidence: this.getConfidenceLevel(history.length),
            dailyAverage: predictedDailyConsumption,
            dailyCost: dailyCost
        };
    },

    calculateMovingAverage(history) {
        // تحويل history إلى مصفوفة من الأيام إذا كانت أشهراً
        let dailyHistory = [];
        
        if (history.length > 0) {
            // إذا كان التاريخ عبارة عن سجلات شهرية
            if (history[0].monthlyConsumption) {
                // تقدير الاستهلاك اليومي من الشهري
                dailyHistory = history.map(record => ({
                    dailyConsumption: (record.monthlyConsumption || 0) / 30
                }));
            } else {
                // إذا كان التاريخ يومياً بالفعل
                dailyHistory = history;
            }
        }
        
        if (dailyHistory.length === 0) return 0;
        
        // أخذ آخر 7 أيام أو أقل
        const lastWeek = dailyHistory.slice(-7);
        
        // وزن مختلف لكل يوم (الأيام الأحدث وزن أعلى)
        const weights = [0.25, 0.2, 0.15, 0.12, 0.1, 0.1, 0.08];
        let totalWeighted = 0;
        let totalWeight = 0;
        
        lastWeek.forEach((day, index) => {
            const weight = weights[index] || 0.1;
            totalWeighted += (day.dailyConsumption || 0) * weight;
            totalWeight += weight;
        });
        
        return totalWeighted / totalWeight;
    },

    getSeasonalAdjustment() {
        const day = new Date().getDay();
        // عطلة نهاية الأسبوع (الجمعة = 5، السبت = 6) استهلاك أعلى
        return (day === 5 || day === 6) ? 1.15 : 1.0;
    },

    calculateDailyCost(dailyConsumption) {
        if (!window.ElectricityCalculator) return dailyConsumption * 0.8;
        const monthlyCost = window.ElectricityCalculator.calculateElectricityCost(dailyConsumption * 30);
        return monthlyCost / 30;
    },

    calculateDaysWithSlabs(balance, dailyCost, history) {
        let days = 0;
        let remainingBalance = balance;
        let currentDailyConsumption = this.calculateMovingAverage(history);
        
        if (currentDailyConsumption <= 0) return 0;
        
        // محاكاة الأيام القادمة مع تغير الشرائح
        for (let i = 0; i < 365; i++) {
            if (remainingBalance <= 0) break;
            
            // تحديث الاستهلاك كل 30 يوم (تغير محتمل في العادة)
            if (i % 30 === 0 && i > 0) {
                currentDailyConsumption *= 0.98; // انخفاض طفيف في الاستهلاك مع الوقت
            }
            
            const dailyCost_ = this.calculateDailyCost(currentDailyConsumption);
            
            if (remainingBalance - dailyCost_ >= 0) {
                remainingBalance -= dailyCost_;
                days++;
            } else {
                break;
            }
        }
        
        return days;
    },

    getConfidenceLevel(historyLength) {
        if (historyLength >= 30) return 'عالية جداً';
        if (historyLength >= 14) return 'عالية';
        if (historyLength >= 7) return 'متوسطة';
        if (historyLength >= 3) return 'منخفضة';
        return 'تقديرية';
    },

    estimateFromAppliances(balance, appliances) {
        if (!appliances || appliances.length === 0) {
            return { days: 0, confidence: 'لا توجد أجهزة', dailyAverage: 0, dailyCost: 0 };
        }
        
        const dailyConsumption = appliances.reduce((sum, app) => {
            return sum + (app.power_kw * app.hours * (app.quantity || 1));
        }, 0);
        
        if (dailyConsumption <= 0) {
            return { days: 0, confidence: 'استهلاك غير صحيح', dailyAverage: 0, dailyCost: 0 };
        }
        
        const dailyCost = this.calculateDailyCost(dailyConsumption);
        const days = Math.floor(balance / dailyCost);
        
        return {
            days: days > 0 ? days : 0,
            confidence: 'تقديرية (من الأجهزة)',
            dailyAverage: dailyConsumption,
            dailyCost: dailyCost
        };
    },
    
    // دالة مبسطة للاستخدام السريع
    getQuickRemainingDays(balance, monthlyCost) {
        if (!balance || balance <= 0 || !monthlyCost || monthlyCost <= 0) return 0;
        return Math.floor((balance / monthlyCost) * 30);
    }
};

// ==================== مُنبئ الاستهلاك ====================

const ConsumptionPredictor = {
    predictNextMonth(history, appliances) {
        if (!history || history.length === 0) {
            return this.predictFromAppliances(appliances);
        }
        
        // 1. تحليل الاتجاه (Trend Analysis)
        const trend = this.analyzeTrend(history);
        
        // 2. موسمية (Seasonality)
        const seasonality = this.getSeasonalityFactor();
        
        // 3. متوسط مرجح
        const weightedAvg = this.calculateWeightedAverage(history);
        
        // 4. التوقع النهائي
        const prediction = weightedAvg * (1 + trend) * seasonality;
        
        // 5. حساب التكلفة المتوقعة
        const predictedCost = window.ElectricityCalculator?.calculateElectricityCost(prediction) || prediction * 0.8;
        
        return {
            consumption: Math.round(prediction),
            cost: Math.round(predictedCost),
            trend: trend,
            confidence: this.calculateConfidence(history.length),
            comparison: this.compareWithPrevious(history, prediction)
        };
    },

    analyzeTrend(history) {
        if (history.length < 2) return 0;
        
        // أخذ آخر 3 أشهر
        const last3 = history.slice(-3);
        let totalChange = 0;
        
        for (let i = 1; i < last3.length; i++) {
            const prev = last3[i-1].monthlyConsumption || 0;
            const curr = last3[i].monthlyConsumption || 0;
            if (prev > 0) {
                const change = (curr - prev) / prev;
                totalChange += change;
            }
        }
        
        return totalChange / (last3.length - 1);
    },

    getSeasonalityFactor() {
        const month = new Date().getMonth();
        // صيف: استهلاك أعلى، شتاء: استهلاك أقل
        const summerMonths = [5, 6, 7, 8]; // يونيو - سبتمبر
        const winterMonths = [11, 0, 1]; // ديسمبر - فبراير
        
        if (summerMonths.includes(month)) return 1.15;
        if (winterMonths.includes(month)) return 0.9;
        return 1.0;
    },

    calculateWeightedAverage(history) {
        if (history.length === 0) return 0;
        
        // وزن أكبر للأشهر الأحدث
        const weights = history.map((_, i) => Math.pow(1.2, i));
        let totalWeighted = 0;
        let totalWeight = 0;
        
        history.forEach((record, i) => {
            const weight = weights[i];
            totalWeighted += (record.monthlyConsumption || 0) * weight;
            totalWeight += weight;
        });
        
        return totalWeighted / totalWeight;
    },

    calculateConfidence(historyLength) {
        if (historyLength >= 12) return 0.95;
        if (historyLength >= 6) return 0.85;
        if (historyLength >= 3) return 0.7;
        return 0.5;
    },

    predictFromAppliances(appliances) {
        if (!appliances || appliances.length === 0) {
            return { consumption: 300, cost: 240, confidence: 0.3 };
        }
        
        const dailyConsumption = appliances.reduce((sum, app) => {
            return sum + (app.power_kw * app.hours * (app.quantity || 1));
        }, 0);
        
        const monthlyConsumption = dailyConsumption * 30;
        const monthlyCost = window.ElectricityCalculator?.calculateElectricityCost(monthlyConsumption) || monthlyConsumption * 0.8;
        
        return {
            consumption: Math.round(monthlyConsumption),
            cost: Math.round(monthlyCost),
            confidence: 0.4
        };
    },

    compareWithPrevious(history, prediction) {
        if (history.length === 0) return null;
        
        const lastMonth = history[history.length - 1].monthlyConsumption || 0;
        if (lastMonth === 0) return null;
        
        const change = ((prediction - lastMonth) / lastMonth) * 100;
        
        return {
            percentage: change,
            direction: change > 0 ? 'increase' : 'decrease',
            amount: Math.abs(prediction - lastMonth)
        };
    },

    generatePredictiveChart(history, prediction) {
        // بيانات للرسم البياني
        const labels = [];
        const values = [];
        
        // الأشهر الماضية
        history.slice(-6).forEach((record, i) => {
            if (record.date) {
                const date = new Date(record.date);
                labels.push(date.toLocaleDateString('ar-EG', { month: 'short' }));
            } else {
                labels.push(`شهر ${i+1}`);
            }
            values.push(record.monthlyConsumption || 0);
        });
        
        // الشهر المتوقع
        labels.push('متوقع');
        values.push(prediction);
        
        return { labels, values };
    }
};

// ==================== مُحسِّن التوفير الشخصي ====================
const PersonalSavingOptimizer = {
    // تحليل شامل لفرص التوفير بناءً على أجهزة المستخدم
    analyzeSavingOpportunities(appliances, consumptionData) {
        if (!appliances || appliances.length === 0) {
            return {
                totalPotentialSaving: 0,
                opportunities: [{
                    type: 'info',
                    title: 'أضف أجهزتك أولاً',
                    description: 'للحصول على خطة توفير مخصصة، قم بإضافة أجهزتك الكهربائية',
                    saving: 0,
                    priority: 'low'
                }]
            };
        }

        let totalPotentialSaving = 0;
        let opportunities = [];

        // 1. تحليل كل جهاز على حدة
        appliances.forEach(appliance => {
            const applianceAnalysis = this.analyzeApplianceSaving(appliance);
            if (applianceAnalysis.saving > 0) {
                totalPotentialSaving += applianceAnalysis.saving;
                opportunities.push(applianceAnalysis);
            }
        });

        // 2. تحليل توزيع الشرائح (فرق الشرائح)
        if (consumptionData && consumptionData.monthlyConsumption > 650) {
            const slabOpportunity = this.analyzeSlabSaving(consumptionData.monthlyConsumption);
            if (slabOpportunity.saving > 0) {
                totalPotentialSaving += slabOpportunity.saving;
                opportunities.push(slabOpportunity);
            }
        }

        // 3. تحليل أوقات الذروة
        const peakOpportunity = this.analyzePeakHoursSaving(appliances);
        if (peakOpportunity.saving > 0) {
            totalPotentialSaving += peakOpportunity.saving;
            opportunities.push(peakOpportunity);
        }

        // 4. ترتيب الفرص حسب أكبر توفير
        opportunities.sort((a, b) => b.saving - a.saving);

        return {
            totalPotentialSaving: Math.round(totalPotentialSaving),
            opportunities: opportunities.slice(0, 5) // أفضل 5 فرص
        };
    },

    // تحليل جهاز واحد وحساب التوفير المحتمل
    analyzeApplianceSaving(appliance) {
        const name = appliance.name;
        const power = appliance.power_kw || 0;
        const hours = appliance.hours || 0;
        const quantity = appliance.quantity || 1;
        
        const dailyConsumption = power * hours * quantity;
        const monthlyConsumption = dailyConsumption * 30;
        const currentCost = this.calculateCost(monthlyConsumption);
        
        let saving = 0;
        let recommendation = '';
        let type = 'tip';
        let priority = 'medium';

        // تحليل حسب نوع الجهاز واستهلاكه
        if (name.includes('تكييف') || name.includes('سخان') || power > 1.5) {
            // الأجهزة عالية الاستهلاك
            
            // اقتراح 1: تقليل ساعة تشغيل
            const reducedHoursSaving = this.calculateSavingFromReducedHours(
                power, hours, quantity, 1 // تقليل ساعة واحدة
            );
            
            if (reducedHoursSaving > 10) {
                saving = reducedHoursSaving;
                recommendation = `⏰ خفض تشغيل ${name} ساعة يومياً يوفر ~${saving} ج.م شهرياً`;
                type = 'high_consumption';
                priority = 'high';
            }
            
            // اقتراح 2: تحسين كفاءة (للأجهزة القديمة)
            if (power > 2) {
                const efficiencySaving = this.calculateEfficiencySaving(power, hours, quantity);
                if (efficiencySaving > saving) {
                    saving = efficiencySaving;
                    recommendation = `💡 استبدال ${name} بآخر موفر للطاقة (A++) يوفر ~${efficiencySaving} ج.م شهرياً`;
                    type = 'efficiency';
                    priority = 'high';
                }
            }
        } 
        else if (name.includes('ثلاجة') || name.includes('فريزر')) {
            // الأجهزة التي تعمل 24 ساعة
            
            // تحسين إعدادات الحرارة
            const tempSaving = this.calculateTemperatureSaving(power, hours, quantity);
            if (tempSaving > 5) {
                saving = tempSaving;
                recommendation = `🌡️ ضبط ${name} على درجة حرارة مناسبة (4-5°) يوفر ~${tempSaving} ج.م شهرياً`;
                type = 'temperature';
                priority = 'medium';
            }
            
            // التأكد من إغلاق الباب بإحكام
            const sealSaving = Math.round(currentCost * 0.15); // 15% توفير
            if (sealSaving > saving) {
                saving = sealSaving;
                recommendation = `🚪 التأكد من إحكام غلق ${name} يوفر ~${sealSaving} ج.م شهرياً`;
                type = 'maintenance';
                priority = 'medium';
            }
        }
        else if (name.includes('غسالة') || name.includes('مكواة')) {
            // أجهزة الاستخدام المتقطع
            
            // استخدام في الأوقات المنخفضة
            const timingSaving = Math.round(currentCost * 0.2); // 20% توفير
            if (timingSaving > 10) {
                saving = timingSaving;
                recommendation = `⚡ تشغيل ${name} خارج أوقات الذروة (بعد 11 مساءً) يوفر ~${timingSaving} ج.م شهرياً`;
                type = 'timing';
                priority = 'medium';
            }
        }
        else if (name.includes('لمبة') || name.includes('إضاءة')) {
            // الإضاءة
            
            // استبدال بلمبات LED
            if (!name.includes('LED') && !name.includes('ليد')) {
                const ledSaving = this.calculateLEDSaving(power, hours, quantity);
                if (ledSaving > 5) {
                    saving = ledSaving;
                    recommendation = `💡 استبدال ${name} بلمبة LED توفر ~${ledSaving} ج.م شهرياً`;
                    type = 'lighting';
                    priority = 'medium';
                }
            }
            
            // إطفاء الإضاءة في الغرف الفارغة
            const offSaving = Math.round(currentCost * 0.3); // 30% توفير
            if (offSaving > saving) {
                saving = offSaving;
                recommendation = `🔌 إطفاء ${name} عند مغادرة الغرفة يوفر ~${offSaving} ج.م شهرياً`;
                type = 'behavior';
                priority = 'high';
            }
        }

        return {
            applianceId: appliance.id,
            applianceName: name,
            type: type,
            title: `توفير في ${name}`,
            description: recommendation,
            saving: saving,
            priority: priority,
            currentConsumption: Math.round(monthlyConsumption),
            currentCost: Math.round(currentCost)
        };
    },

    // تحليل فرق الشرائح
    analyzeSlabSaving(monthlyConsumption) {
        if (monthlyConsumption <= 650) return { saving: 0 };
        
        let targetConsumption = 650;
        let requiredReduction = monthlyConsumption - targetConsumption;
        let currentCost = this.calculateCost(monthlyConsumption);
        let targetCost = this.calculateCost(targetConsumption);
        
        // الفرق + خصم 378 للشريحة السادسة
        let saving = 0;
        
        if (monthlyConsumption > 650 && monthlyConsumption <= 1000) {
            // الشريحة السادسة - يوجد خصم 378
            saving = (currentCost - targetCost) + 378;
        } else if (monthlyConsumption > 1000) {
            // الشريحة السابعة - بدون دعم
            saving = currentCost - targetCost;
        }
        
        return {
            type: 'slab',
            title: '🏆 قفزة في التوفير',
            description: `خفض استهلاكك من ${Math.round(monthlyConsumption)} إلى 650 ك.و/شهر يوفر ~${Math.round(saving)} ج.م شهرياً`,
            saving: Math.round(saving),
            priority: 'critical',
            details: {
                requiredReduction: Math.round(requiredReduction),
                currentCost: Math.round(currentCost),
                targetCost: Math.round(targetCost),
                extraSaving: monthlyConsumption <= 1000 ? 378 : 0
            }
        };
    },

    // تحليل أوقات الذروة
    analyzePeakHoursSaving(appliances) {
        const peakHours = [17, 18, 19, 20, 21, 22]; // 5 مساءً - 11 مساءً
        
        // الأجهزة التي يمكن تأجيلها
        const shiftableAppliances = appliances.filter(a => 
            a.name.includes('غسالة') || 
            a.name.includes('مكواة') || 
            a.name.includes('سخان') ||
            a.name.includes('مكنسة')
        );
        
        if (shiftableAppliances.length === 0) return { saving: 0 };
        
        let totalSaving = 0;
        
        shiftableAppliances.forEach(a => {
            const power = a.power_kw || 0;
            const hours = a.hours || 0;
            const quantity = a.quantity || 1;
            
            // إذا كان يستخدم في ساعات الذروة
            if (hours > 0) {
                const dailyConsumption = power * hours * quantity;
                const monthlyConsumption = dailyConsumption * 30;
                const currentCost = this.calculateCost(monthlyConsumption);
                
                // توفير 20% بتغيير التوقيت
                const saving = Math.round(currentCost * 0.2);
                totalSaving += saving;
            }
        });
        
        if (totalSaving > 0) {
            return {
                type: 'peak',
                title: '⏰ تحسين أوقات التشغيل',
                description: `تشغيل الغسالة والمكواة بعد 11 مساءً يوفر ~${totalSaving} ج.م شهرياً`,
                saving: totalSaving,
                priority: 'high'
            };
        }
        
        return { saving: 0 };
    },

    // دوال مساعدة للحسابات
    calculateCost(consumption) {
        if (window.ElectricityCalculator) {
            return window.ElectricityCalculator.calculateElectricityCost(consumption);
        }
        return consumption * 0.8; // تقريبي
    },

    calculateSavingFromReducedHours(power, hours, quantity, reduceBy) {
        if (hours <= reduceBy) return 0;
        
        const newHours = hours - reduceBy;
        const oldMonthly = power * hours * quantity * 30;
        const newMonthly = power * newHours * quantity * 30;
        
        return Math.round(this.calculateCost(oldMonthly) - this.calculateCost(newMonthly));
    },

    calculateEfficiencySaving(power, hours, quantity) {
        // جهاز موفر يستهلك 30% أقل
        const efficientPower = power * 0.7;
        const oldMonthly = power * hours * quantity * 30;
        const newMonthly = efficientPower * hours * quantity * 30;
        
        return Math.round(this.calculateCost(oldMonthly) - this.calculateCost(newMonthly));
    },

    calculateTemperatureSaving(power, hours, quantity) {
        // تحسين الحرارة يوفر 15%
        return Math.round(this.calculateCost(power * hours * quantity * 30) * 0.15);
    },

    calculateLEDSaving(power, hours, quantity) {
        // لمبة LED تستهلك 10% من اللمبة المتوهجة
        if (power > 0.05) { // إذا كانت لمبة عادية
            const ledPower = power * 0.1;
            const oldMonthly = power * hours * quantity * 30;
            const newMonthly = ledPower * hours * quantity * 30;
            
            return Math.round(this.calculateCost(oldMonthly) - this.calculateCost(newMonthly));
        }
        return 0;
    },

    // إنشاء خطة توفير شهرية متدرجة
    generateSavingPlan(appliances, consumptionData) {
        const analysis = this.analyzeSavingOpportunities(appliances, consumptionData);
        
        // تصنيف الفرص حسب الجهد المطلوب
        const plan = {
            quickWins: [], // سهلة وسريعة
            mediumEffort: [], // تحتاج تغيير عادة
            highEffort: [], // تحتاج استثمار
            totalSaving: analysis.totalPotentialSaving
        };
        
        analysis.opportunities.forEach(opp => {
            if (opp.type === 'behavior' || opp.type === 'timing' || opp.type === 'temperature') {
                plan.quickWins.push(opp);
            } else if (opp.type === 'maintenance' || opp.type === 'lighting') {
                plan.mediumEffort.push(opp);
            } else {
                plan.highEffort.push(opp);
            }
        });
        
        return plan;
    }
};

// ==================== تصدير الدوال ====================

// تصدير الدوال للاستخدام في ملفات أخرى
window.ElectricityCalculator = {
    calculateElectricityCost,
    getCurrentSlab,
    calculateDailyConsumption,
    calculateMonthlyConsumption,
    estimateRemainingDays,
    calculatePotentialSavings,
    analyzeHighConsumptionAppliances,
    generateAnalysisReport,
    generateRecommendations,
    electricityTariffs,
    defaultAppliances
};

window.AdvancedCalculator = AdvancedConsumptionCalculator;
window.ConsumptionPredictor = ConsumptionPredictor;
window.PersonalSavingOptimizer = PersonalSavingOptimizer;

// تهيئة القائمة المنسدلة للأجهزة في الصفحة الرئيسية (إذا كانت موجودة)
document.addEventListener('DOMContentLoaded', function() {
    // تهيئة الحاسبة السريعة في الصفحة الرئيسية
    const quickCalculateBtn = document.getElementById('quick-calculate');
    if (quickCalculateBtn) {
        quickCalculateBtn.addEventListener('click', calculateQuickEstimation);
    }
    
    console.log("تم تحميل الآلة الحاسبة بنجاح مع دعم التوفير الشخصي المتقدم");
});