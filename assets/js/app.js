const { createApp, ref, watch, nextTick } = Vue;

createApp({
    setup() {
        const { showToast } = vant;
        const isLoggedIn = ref(false);
        const loginStep = ref(1);
        const role = ref('patient');
        const smsCountdown = ref(0);
        const roleAccounts = { doctor: ['13800000000'], admin: ['13900000000'] };
        const resolveRoleByPhone = (phone) => {
            if (roleAccounts.admin.includes(phone)) return 'admin';
            if (roleAccounts.doctor.includes(phone)) return 'doctor';
            return 'patient';
        };
        const smsSent = ref(false);

        const showPointsHistory = ref(false);
        const showPatientProfile = ref(false);
        const showSensitiveWords = ref(false);
        const showCommentDialog = ref(false);

        const dietFiles = ref([]);
        const sportFiles = ref([]);
        const showBodyMetrics = ref(false);

        const loginForm = ref({ phone: '', sms: '', realName: '', nickname: '', height: '', weight: '' });
        const form = ref({ water: 1500, sleep: 7.5 });
        const checkinForm = ref({
            weight: '',
            bodyFat: '',
            waist: '',
            hip: '',
            dietLevel: '1',
            sportMinutes: '',
            sportTags: [],
            stool: 'a',
            desc: '',
            hideWeight: true
        });

        const points = ref(3850);
        const checkinDays = ref(42);
        const todayRank = ref(5);

        const adminSettings = ref({ baseScore: '10', imageBonus: '5', dailyCap: '50', postLimit: '3', resetCycleMonths: '3', lastResetAt: new Date().toISOString() });

        const sensitiveWords = ref(['减肥药', '代餐', '放弃', '太饿了', '微商加我']);
        const illegalWords = ref(['加微信', '刷单', '返利', '点击链接']);
        const newWord = ref('');
        const newIllegalWord = ref('');
        const userRisk = ref({ violationCount: 0, muted: false });
        const doctorReplyDraft = ref({});
        const doctorAlerts = ref([]);
        const addWord = () => {
            if (!newWord.value.trim()) return;
            if (!sensitiveWords.value.includes(newWord.value.trim())) sensitiveWords.value.push(newWord.value.trim());
            newWord.value = '';
            showToast('敏感词已加入词库');
        };
        const removeWord = (index) => {
            sensitiveWords.value.splice(index, 1);
            showToast('已移除');
        };
        const addIllegalWord = () => {
            const word = String(newIllegalWord.value || '').trim();
            if (!word) return;
            if (!illegalWords.value.includes(word)) illegalWords.value.push(word);
            newIllegalWord.value = '';
            showToast('非法词已加入词库');
        };
        const removeIllegalWord = (index) => {
            illegalWords.value.splice(index, 1);
            showToast('非法词已移除');
        };

        const containsSensitiveWord = (text = '') => {
            return [...sensitiveWords.value, ...illegalWords.value].find((word) => text.includes(word));
        };

        const markViolation = () => {
            userRisk.value.violationCount += 1;
            if (userRisk.value.violationCount >= 3) userRisk.value.muted = true;
            refreshDoctorAlerts();
        };

        const refreshDoctorAlerts = () => {
            const alerts = [];
            if (userRisk.value.violationCount > 0) {
                alerts.push({ realName: loginForm.value.realName || '未实名', nickname: loginForm.value.nickname || '匿名用户', message: `近7日触发敏感词 ${userRisk.value.violationCount} 次，请人工复核`, level: '敏感词预警' });
            }
            const latest = feed.value[0];
            if (latest && Number(latest.sport || 0) === 0) {
                alerts.push({ realName: loginForm.value.realName || '未实名', nickname: latest.name, message: '最近一次打卡无运动记录，建议医生主动跟进', level: '依从性预警' });
            }
            doctorAlerts.value = alerts;
        };

        const applyResetCycleIfNeeded = () => {
            const cycleMonths = Number(adminSettings.value.resetCycleMonths) || 3;
            const last = new Date(adminSettings.value.lastResetAt || Date.now());
            const now = new Date();
            const diffMonths = (now.getFullYear() - last.getFullYear()) * 12 + (now.getMonth() - last.getMonth());
            if (diffMonths >= cycleMonths) {
                rankList.value = rankList.value.map((item) => ({ ...item, days: 0, pts: 0 }));
                adminSettings.value.lastResetAt = now.toISOString();
                localStorage.setItem('adminSettings', JSON.stringify(adminSettings.value));
                showToast('排行榜已按周期自动清零');
            }
        };

        let timer = null;
        const sendSmsCode = () => {
            if (!/^1\d{10}$/.test(loginForm.value.phone)) {
                showToast('请输入正确的11位手机号');
                return;
            }
            smsSent.value = true;
            loginForm.value.sms = '';
            smsCountdown.value = 60;
            timer = setInterval(() => {
                smsCountdown.value -= 1;
                if (smsCountdown.value <= 0) clearInterval(timer);
            }, 1000);
            showToast('验证码为演示模式：123456');
        };

        const goProfileStep = () => {
            if (!/^1\d{10}$/.test(loginForm.value.phone)) {
                showToast('手机号格式有误');
                return;
            }
            if (!smsSent.value) {
                showToast('请先发送验证码');
                return;
            }
            if (!loginForm.value.sms) {
                showToast('请输入验证码');
                return;
            }
            const currentRole = resolveRoleByPhone(loginForm.value.phone);
            role.value = currentRole;
            if (currentRole !== 'patient') {
                role.value = 'patient';
            isLoggedIn.value = true;
                showToast(currentRole === 'doctor' ? '医生账号登录成功' : '总控后台账号登录成功');
                return;
            }
            loginStep.value = 2;
        };

        const doLogin = () => {
            const fieldLabelMap = {
                realName: '真实姓名',
                nickname: '社区昵称',
                height: '身高',
                weight: '初始体重'
            };

            const normalized = {
                realName: String(loginForm.value.realName || '').trim(),
                nickname: String(loginForm.value.nickname || '').trim(),
                height: String(loginForm.value.height || '').trim(),
                weight: String(loginForm.value.weight || '').trim()
            };

            const missingKeys = Object.keys(normalized).filter((key) => !normalized[key]);
            if (missingKeys.length) {
                const missingLabels = missingKeys.map((key) => fieldLabelMap[key]).join('、');
                showToast(`请完善：${missingLabels}`);
                return;
            }

            loginForm.value = { ...loginForm.value, ...normalized };
            isLoggedIn.value = true;
            showToast(`欢迎你，${normalized.nickname}`);
            nextTick(() => {
                if (pTab.value === 'dashboard') renderChart();
            });
        };

        const roles = {
            patient: { title: '演示：1. 患者端 (前端闭环)', color: '#10b981' },
            doctor: { title: '演示：2. 医生端 (运营中心)', color: '#0284c7' },
            admin: { title: '演示：3. 平台总控后台 (数据与规则)', color: '#6366f1' }
        };

        const pTab = ref('record');
        const dTab = ref('feed');
        const rankTab = ref(0);

        const feed = ref([
            { name: '努力变瘦的小猫', time: '10分钟前', sport: 45, weight: 70.8, showWeight: false, content: '今天也是严格执行医生食谱的一天！腰围小了2cm。', isPinned: true, isFeatured: true, likes: 124, liked: false, comments: [], drName: '徐', drReply: '非常好！腰围的缩小说明内脏脂肪在减少，继续保持。' },
            { name: '深夜食堂逃兵', time: '半小时前', sport: 60, weight: 82.5, showWeight: true, content: '中午没忍住吃了一块蛋糕，晚上去跑了10公里赎罪。', isPinned: false, isFeatured: false, likes: 45, liked: false, comments: [], drName: null, drReply: null },
            { name: '张阿姨要健康', time: '2小时前', sport: 30, weight: 65.2, showWeight: false, content: '刚做完复查，各项指标都正常了！感谢大家鼓励。', isPinned: false, isFeatured: false, likes: 312, liked: false, comments: [], drName: '王', drReply: '恭喜张阿姨！进入体重维持期也要坚持健康作息。' }
        ]);

        const rankList = ref([
            { name: '自律给我自由', days: 142, percent: 15.2, pts: 12500 },
            { name: '燃烧吧脂肪', days: 128, percent: 14.8, pts: 11200 },
            { name: '减脂不反弹', days: 115, percent: 12.5, pts: 9800 }
        ]);

        const resetCheckinForm = () => {
            checkinForm.value = { weight: '', bodyFat: '', waist: '', hip: '', dietLevel: '1', sportMinutes: '', sportTags: [], stool: 'a', desc: '', hideWeight: true };
            dietFiles.value = [];
            sportFiles.value = [];
            showBodyMetrics.value = false;
            form.value = { water: 1500, sleep: 7.5 };
        };

        const submitCheckin = () => {
            if (userRisk.value.muted) {
                showToast('当前账号因多次敏感词触发已被禁言，请联系医生处理');
                return;
            }
            if (!checkinForm.value.weight) {
                showToast('请先填写今日体重');
                return;
            }
            const badWord = containsSensitiveWord(checkinForm.value.desc);
            if (badWord) {
                markViolation();
                showToast(`动态包含敏感词：${badWord}`);
                return;
            }
            const postLimit = Number(adminSettings.value.postLimit) || 3;
            const myName = loginForm.value.nickname || '新用户';
            const myTodayPosts = feed.value.filter((p) => p.name === myName && p.time === '刚刚').length;
            if (myTodayPosts >= postLimit) {
                showToast(`今日发布已达上限（${postLimit}次）`);
                return;
            }
            const baseScore = Number(adminSettings.value.baseScore) || 10;
            const imageBonus = Number(adminSettings.value.imageBonus) || 5;
            const dailyCap = Number(adminSettings.value.dailyCap) || 50;
            const imageScore = (dietFiles.value.length + sportFiles.value.length > 0) ? imageBonus : 0;
            const earn = Math.min(baseScore + imageScore, dailyCap);
            points.value += earn;
            checkinDays.value += 1;

            const newPost = {
                name: loginForm.value.nickname || '新用户',
                time: '刚刚',
                sport: Number(checkinForm.value.sportMinutes) || 0,
                weight: Number(checkinForm.value.weight),
                showWeight: !checkinForm.value.hideWeight,
                content: checkinForm.value.desc || '完成今日健康打卡，继续保持！',
                isPinned: false,
                isFeatured: false,
                likes: 0,
                liked: false,
                comments: [],
                drName: null,
                drReply: null
            };
            feed.value.unshift(newPost);
            refreshDoctorAlerts();
            showToast(`打卡成功，积分 +${earn}`);
            pTab.value = 'square';
            resetCheckinForm();
        };

        const toggleLike = (idx) => {
            const post = feed.value[idx];
            post.liked = !post.liked;
            post.likes += post.liked ? 1 : -1;
        };

        const currentCommentPost = ref(-1);
        const commentText = ref('');
        const openCommentDialog = (idx) => {
            currentCommentPost.value = idx;
            commentText.value = '';
            showCommentDialog.value = true;
        };
        const submitComment = () => {
            if (userRisk.value.muted) {
                showToast('当前账号已禁言，暂不可评论');
                return;
            }
            if (currentCommentPost.value < 0) return;
            const text = commentText.value.trim();
            if (!text) {
                showToast('评论不能为空');
                return;
            }
            const badWord = containsSensitiveWord(text);
            if (badWord) {
                markViolation();
                showToast(`评论包含敏感词：${badWord}`);
                return;
            }
            feed.value[currentCommentPost.value].comments.push({ text, by: loginForm.value.nickname || '匿名用户' });
            refreshDoctorAlerts();
            showToast('评论发布成功');
        };

        const submitDoctorReply = (idx) => {
            const text = String(doctorReplyDraft.value[idx] || '').trim();
            if (!text) {
                showToast('请输入点评内容');
                return;
            }
            feed.value[idx].drName = '值班';
            feed.value[idx].drReply = text;
            doctorReplyDraft.value[idx] = '';
            showToast('医生点评已发布');
        };

        const doctorLike = (idx) => {
            feed.value[idx].likes += 1;
            showToast('已代表医生点赞');
        };
        const toggleFeatured = (idx) => {
            feed.value[idx].isFeatured = !feed.value[idx].isFeatured;
            showToast(feed.value[idx].isFeatured ? '已设为加精' : '已取消加精');
        };
        const togglePinned = (idx) => {
            feed.value[idx].isPinned = !feed.value[idx].isPinned;
            showToast(feed.value[idx].isPinned ? '已置顶' : '已取消置顶');
        };
        const rewardPatient = () => {
            showToast('奖励已发放：+50分');
        };
        const batchLike = () => {
            feed.value.forEach((post) => { post.likes += 1; });
            showToast('批量点赞成功');
        };

        const ackAlert = () => {
            if (!doctorAlerts.value.length) {
                showToast('暂无可处理预警');
                return;
            }
            doctorAlerts.value.shift();
            showToast('已发送预警通知');
        };

        const patientProfileData = ref({ name: '王建国', phone: '138****8888', initialWeight: 85, currentWeight: 79.8, days: 42, trend: [85,84.1,83.5,82.6,81.3,80.4,79.8] });

        let patientChart = null;
        const renderPatientProfileChart = () => {
            const ctx = document.getElementById('patientProfileChart');
            if (!ctx) return;
            if (patientChart) patientChart.destroy();
            patientChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['第1周','第2周','第3周','第4周','第5周','第6周','本周'],
                    datasets: [{ label: '体重趋势(kg)', data: patientProfileData.value.trend, borderColor: '#0284c7', tension: 0.35 }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        };

        const exportPatientProfile = () => {
            const rows = [
                ['姓名', patientProfileData.value.name],
                ['手机号', patientProfileData.value.phone],
                ['初始体重', patientProfileData.value.initialWeight],
                ['当前体重', patientProfileData.value.currentWeight],
                ['累计打卡天数', patientProfileData.value.days]
            ];
            if (window.XLSX) {
                const ws = XLSX.utils.aoa_to_sheet(rows);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'patient-profile');
                XLSX.writeFile(wb, `patient-profile-${Date.now()}.xlsx`);
                showToast('患者档案已导出');
                return;
            }
            const csv = rows.map((r) => r.join(',')).join('\n');
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `patient-profile-${Date.now()}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('患者档案已导出');
        };

        const saveAdminSettings = () => {
            localStorage.setItem('adminSettings', JSON.stringify(adminSettings.value));
            showToast('规则已保存');
        };

        const exportCheckins = () => {
            const data = feed.value.map((post) => ({
                昵称: post.name,
                时间: post.time,
                运动分钟: post.sport,
                体重展示: post.showWeight ? `${post.weight}kg` : '已隐藏',
                文案: post.content,
                点赞数: post.likes
            }));

            if (window.XLSX) {
                const ws = XLSX.utils.json_to_sheet(data);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'checkins');
                XLSX.writeFile(wb, `checkin-export-${Date.now()}.xlsx`);
                showToast('导出成功（XLSX）');
                return;
            }

            const rows = [['昵称', '时间', '运动分钟', '体重展示', '文案', '点赞数']];
            data.forEach((item) => rows.push([item.昵称, item.时间, item.运动分钟, item.体重展示, item.文案, item.点赞数]));
            const csv = rows.map((row) => row.map((i) => `"${String(i).replaceAll('"', '""')}"`).join(',')).join('\n');
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `checkin-export-${Date.now()}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('导出成功（CSV）');
        };

        let myChart = null;
        const renderChart = () => {
            const ctx = document.getElementById('healthChart');
            if (!ctx) return;
            if (myChart) myChart.destroy();
            myChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['1号', '5号', '10号', '15号', '20号', '25号', '今日'],
                    datasets: [
                        { label: '体重(kg)', data: [75, 74.2, 73.5, 73.0, 72.1, 71.5, 70.8], borderColor: '#10b981', tension: 0.4 },
                        { label: '腰围(cm)', data: [88, 87.5, 87, 86, 85.5, 84, 83], borderColor: '#f59e0b', borderDash: [5, 5], tension: 0.4 }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false } } } }
            });
        };

        watch([role, pTab], () => {
            if (isLoggedIn.value && role.value === 'patient' && pTab.value === 'dashboard') nextTick(renderChart);
        });

        watch(showPatientProfile, (val) => {
            if (val) nextTick(renderPatientProfileChart);
        });

        try {
            const cached = localStorage.getItem('adminSettings');
            if (cached) adminSettings.value = { ...adminSettings.value, ...JSON.parse(cached) };
        } catch (e) {
            console.warn('读取本地设置失败', e);
        }

        applyResetCycleIfNeeded();
        refreshDoctorAlerts();

        return {
            isLoggedIn, loginStep, loginForm, doLogin,
            role, roles,
            pTab, dTab, rankTab,
            dietFiles, sportFiles, form, showBodyMetrics, checkinForm, submitCheckin,
            showPointsHistory, showPatientProfile, showSensitiveWords,
            sensitiveWords, illegalWords, newWord, newIllegalWord, addWord, removeWord, addIllegalWord, removeIllegalWord,
            feed, rankList, toggleLike,
            points, checkinDays, todayRank,
            showCommentDialog, commentText, openCommentDialog, submitComment,
            smsCountdown, smsSent, sendSmsCode, goProfileStep,
            doctorLike, toggleFeatured, togglePinned, rewardPatient, batchLike, submitDoctorReply, doctorReplyDraft,
            adminSettings, saveAdminSettings, exportCheckins, userRisk, doctorAlerts, ackAlert, exportPatientProfile
        };
    }
}).use(vant).mount('#app');
