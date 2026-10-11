// advancedChart.js
const AdvancedChartManager = {
    charts: {},
    
    createConsumptionChart(containerId, history, prediction) {
        const ctx = document.getElementById(containerId)?.getContext('2d');
        if (!ctx) return;
        
        // تجهيز البيانات
        const data = this.prepareChartData(history, prediction);
        
        // إنشاء الرسم البياني
        this.charts[containerId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'الاستهلاك الفعلي',
                        data: data.actual,
                        borderColor: '#1976D2',
                        backgroundColor: 'rgba(25, 118, 210, 0.1)',
                        borderWidth: 3,
                        pointRadius: 5,
                        pointHoverRadius: 8,
                        pointBackgroundColor: '#1976D2',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'التوقعات',
                        data: data.predicted,
                        borderColor: '#FF9800',
                        borderWidth: 3,
                        borderDash: [5, 5],
                        pointRadius: 6,
                        pointHoverRadius: 10,
                        pointBackgroundColor: '#FF9800',
                        tension: 0.3,
                        type: 'line'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 2000,
                    easing: 'easeInOutQuart',
                    onProgress: (animation) => {
                        // تأثير تقدم الرسم
                        console.log(`Chart progress: ${animation.currentStep / animation.numSteps * 100}%`);
                    }
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: '#0f0096',
                        borderWidth: 2,
                        padding: 12,
                        callbacks: {
                            label: (context) => {
                                let label = context.dataset.label || '';
                                let value = context.raw || 0;
                                return `${label}: ${value.toFixed(0)} ك.و/س`;
                            }
                        }
                    },
                    annotation: {
                        annotations: this.getAnnotations(history)
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0,0,0,0.05)'
                        },
                        title: {
                            display: true,
                            text: 'كيلوواط/ساعة',
                            font: { size: 14, weight: 'bold' }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
        
        // إضافة تأثيرات حركية إضافية
        this.animateChartEntrance(containerId);
    },
    
    prepareChartData(history, prediction) {
        const labels = [];
        const actual = [];
        const predicted = [];
        
        // آخر 6 أشهر
        const last6Months = history.slice(-6);
        
        last6Months.forEach(record => {
            const date = new Date(record.date);
            labels.push(date.toLocaleDateString('ar-EG', { month: 'short', year: '2-digit' }));
            actual.push(record.monthlyConsumption);
            predicted.push(null); // لا توقعات للماضي
        });
        
        // الشهر الحالي والمتوقع
        const today = new Date();
        labels.push(today.toLocaleDateString('ar-EG', { month: 'short' }) + ' (متوقع)');
        actual.push(null);
        predicted.push(prediction?.consumption || 0);
        
        // الشهر القادم
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        labels.push(nextMonth.toLocaleDateString('ar-EG', { month: 'short' }) + ' (متوقع)');
        actual.push(null);
        predicted.push(prediction?.consumption ? Math.round(prediction.consumption * 1.05) : 0);
        
        return { labels, actual, predicted };
    },
    
    getAnnotations(history) {
        const annotations = {};
        
        if (history.length > 0) {
            // تحديد أفضل شهر
            const bestMonth = history.reduce((best, current) => 
                current.monthlyConsumption < best.monthlyConsumption ? current : best
            );
            
            const bestMonthDate = new Date(bestMonth.date);
            const bestMonthLabel = bestMonthDate.toLocaleDateString('ar-EG', { month: 'short', year: '2-digit' });
            
            annotations.bestMonth = {
                type: 'point',
                xValue: bestMonthLabel,
                yValue: bestMonth.monthlyConsumption,
                backgroundColor: 'rgba(46, 125, 50, 0.8)',
                borderColor: '#0f0096',
                borderWidth: 2,
                radius: 8,
                label: {
                    content: '🏆 أفضل شهر',
                    enabled: true,
                    position: 'top',
                    backgroundColor: 'rgba(46, 125, 50, 0.9)',
                    color: 'white',
                    font: { size: 12, weight: 'bold' }
                }
            };
        }
        
        return annotations;
    },
    
    animateChartEntrance(chartId) {
        const container = document.getElementById(chartId)?.parentElement;
        if (!container) return;
        
        container.style.opacity = '0';
        container.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            container.style.transition = 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
        }, 100);
    },
    
    createSlabDistributionChart(containerId, consumption) {
        const ctx = document.getElementById(containerId)?.getContext('2d');
        if (!ctx) return;
        
        // حساب توزيع الشرائح
        const slabDistribution = this.calculateSlabDistribution(consumption);
        
        this.charts[containerId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: slabDistribution.labels,
                datasets: [{
                    data: slabDistribution.values,
                    backgroundColor: [
                        '#66BB6A',
                        '#FFA726',
                        '#EF5350',
                        '#42A5F5',
                        '#AB47BC'
                    ],
                    borderWidth: 0,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 1500,
                    easing: 'easeInOutCubic'
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        rtl: true,
                        labels: {
                            font: { size: 13, family: 'Cairo' },
                            padding: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.raw;
                                const percentage = ((value / consumption) * 100).toFixed(1);
                                return `${context.label}: ${value} ك.و/س (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    },
    
    calculateSlabDistribution(consumption) {
        const slabs = [
            { name: 'الشريحة 1-3', max: 200, color: '#66BB6A' },
            { name: 'الشريحة 4', max: 350, color: '#FFA726' },
            { name: 'الشريحة 5', max: 650, color: '#EF5350' },
            { name: 'الشريحة 6', max: 1000, color: '#42A5F5' },
            { name: 'الشريحة 7', max: Infinity, color: '#AB47BC' }
        ];
        
        let remaining = consumption;
        const distribution = [];
        const labels = [];
        
        for (const slab of slabs) {
            if (remaining <= 0) break;
            
            const slabConsumption = Math.min(remaining, slab.max - (slabs[slabs.indexOf(slab) - 1]?.max || 0));
            if (slabConsumption > 0) {
                distribution.push(slabConsumption);
                labels.push(slab.name);
                remaining -= slabConsumption;
            }
        }
        
        return { labels, values: distribution };
    }
};

window.AdvancedChartManager = AdvancedChartManager;