// ========== 常量 ==========
const NO_FERT_PLANTS_PER_2_SEC = 18;
const NORMAL_FERT_PLANTS_PER_2_SEC = 12;
const NO_FERT_PLANT_SPEED = NO_FERT_PLANTS_PER_2_SEC / 2; // 9
const NORMAL_FERT_PLANT_SPEED = NORMAL_FERT_PLANTS_PER_2_SEC / 2; // 6
const FERT_OPERATION_SEC_PER_LAND = 0.1; // 每块地每次施肥操作 100ms
// 每日其他经验（生长周期外）：除虫草1500、放虫草1000、种植1000、铲地600
const EXP_DAILY_OTHER = 1500 + 1000 + 1000 + 600;

// ========== 数据 ==========
let seedData = [];
let plantPhaseMap = {};
let plantPhaseDurationsMap = {};
let seedImageMap = {};
let seedNameImageMap = {};
let calculatedRows = [];
let currentRankTab = 'noFert';

// 作物 emoji 映射
const cropEmojis = {
    '白萝卜': '🥕', '胡萝卜': '🥕', '大白菜': '🥬', '大蒜': '🧄', '大葱': '🧅',
    '水稻': '🌾', '小麦': '🌾', '玉米': '🌽', '鲜姜': '🫚', '土豆': '🥔',
    '小白菜': '🥬', '生菜': '🥬', '油菜': '🌿', '茄子': '🍆', '红枣': '🫘',
    '蒲公英': '🌼', '银莲花': '🌸', '番茄': '🍅', '花菜': '🥦', '韭菜': '🌿',
    '小雏菊': '🌼', '豌豆': '🫛', '莲藕': '🪷', '红玫瑰': '🌹', '秋菊（黄色）': '🌻',
    '满天星': '💫', '含羞草': '🌿', '牵牛花': '🌺', '秋菊（红色）': '🌺', '辣椒': '🌶️',
    '黄瓜': '🥒', '芹菜': '🌿', '天香百合': '🌷', '南瓜': '🎃', '核桃': '🌰',
    '山楂': '🍒', '菠菜': '🥬', '草莓': '🍓', '苹果': '🍎', '四叶草': '🍀',
    '非洲菊': '🌼', '火绒草': '🌿', '花香根鸢尾': '💐', '虞美人': '🌺', '向日葵': '🌻',
    '西瓜': '🍉', '黄豆': '🫘', '香蕉': '🍌', '竹笋': '🎋', '桃子': '🍑',
    '甘蔗': '🎋', '橙子': '🍊', '茉莉花': '🌸', '葡萄': '🍇', '丝瓜': '🥒',
    '榛子': '🌰', '迎春花': '🌼', '石榴': '🍎', '栗子': '🌰', '柚子': '🍊',
    '蘑菇': '🍄', '菠萝': '🍍', '箬竹': '🎋', '无花果': '🫒', '椰子': '🥥',
    '花生': '🥜', '金针菇': '🍄', '葫芦': '🫑', '猕猴桃': '🥝', '梨': '🍐',
    '睡莲': '🪷', '火龙果': '🐉', '枇杷': '🍑', '樱桃': '🍒', '李子': '🫐',
    '荔枝': '🍒', '香瓜': '🍈', '木瓜': '🥭', '桂圆': '🫐', '月柿': '🍊',
    '杨桃': '⭐', '哈密瓜': '🍈', '桑葚': '🫐', '柠檬': '🍋', '芒果': '🥭',
    '杨梅': '🫐', '榴莲': '🥭', '番石榴': '🍈', '瓶子树': '🌳', '蓝莓': '🫐',
    '猪笼草': '🌿', '山竹': '🍑', '曼陀罗华': '🌸', '曼珠沙华': '🌺', '苦瓜': '🥒',
    '天堂鸟': '🦜', '冬瓜': '🥒', '豹皮花': '🌺', '杏子': '🍑', '金桔': '🍊',
};

function getCropEmoji(name) {
    return cropEmojis[name] || '🌱';
}

function getCropImage(seedId, name, size = 32) {
    const fileName = seedImageMap[seedId] || seedNameImageMap[name];
    if (fileName) {
        return `<img src="seed_images_named/${fileName}" alt="${name}" class="crop-img" loading="lazy" style="width:${size}px;height:${size}px;">`;
    }
    return `<span style="font-size:${size * 0.75}px;">${getCropEmoji(name)}</span>`;
}

// ========== 初始化 ==========
async function init() {
    try {
        const [seedRes, plantRes, mappingRes] = await Promise.all([
            fetch('seed-shop-merged-export.json'),
            fetch('Plant.json'),
            fetch('seed_mapping.json'),
        ]);
        const seedJson = await seedRes.json();
        const plantJson = await plantRes.json();
        const mappingJson = await mappingRes.json();

        // 构建 seedId -> 图片文件名 映射 + name -> 图片文件名 映射
        seedImageMap = {};
        seedNameImageMap = {};
        for (const m of mappingJson) {
            const sid = Number(m.seedId);
            if (sid > 0 && m.fileName) {
                seedImageMap[sid] = m.fileName;
            }
            if (m.name && m.fileName && m.name !== '未知') {
                seedNameImageMap[m.name] = m.fileName;
            }
        }

        seedData = Array.isArray(seedJson) ? seedJson : (seedJson.rows || seedJson.seeds || []);

        // 构建 plant phase map
        plantPhaseMap = {};
        plantPhaseDurationsMap = {};
        for (const p of plantJson) {
            const seedId = Number(p.seed_id) || 0;
            if (seedId <= 0 || plantPhaseMap[seedId]) continue;
            const phases = parseGrowPhases(p.grow_phases);
            if (phases.length > 0) {
                plantPhaseMap[seedId] = phases[0];
                plantPhaseDurationsMap[seedId] = phases;
            }
        }

        // 初始计算
        // calculate();
        renderCatalog();
        bindSkillControls();
        fillFertCropSelect();
    } catch (e) {
        console.error('初始化失败:', e);
        showToast(
            '⚠️ 数据加载失败，无法读取种子数据。\n\n' +
            '请通过「本地服务器」打开本页面（不要直接双击 index.html），例如用 nginx 或 VS Code Live Server 打开。'
        );
    }
}

function parseGrowPhases(growPhases) {
    if (!growPhases || typeof growPhases !== 'string') return [];
    return growPhases
        .split(';')
        .map(x => x.trim())
        .filter(Boolean)
        .map(seg => {
            const parts = seg.split(':');
            return parts.length >= 2 ? (Number(parts[1]) || 0) : 0;
        })
        .filter(sec => sec > 0);
}

function formatSec(sec) {
    const s = Math.max(0, Math.round(sec));
    if (s < 60) return `${s}秒`;
    const m = Math.floor(s / 60);
    const r = s % 60;
    if (m < 60) return r > 0 ? `${m}分${r}秒` : `${m}分钟`;
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return mm > 0 ? `${h}小时${mm}分` : `${h}小时`;
}

function formatDuration(sec) {
    if (!Number.isFinite(sec)) return '无限';
    const s = Math.max(0, Math.round(sec));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}天${h}小时`;
    if (h > 0) return `${h}小时${m}分`;
    if (m > 0) return `${m}分钟`;
    return `${s}秒`;
}

/** 格式化为游戏内显示的 X.X小时 */
function formatHours(sec) {
    if (!Number.isFinite(sec) || sec <= 0) return '0小时';
    const h = Math.round((sec / 3600) * 10) / 10;
    return h >= 0.1 ? h + '小时' : (Math.round(sec / 60) + '分钟');
}

function estimateOrganicSupportSec(row, organicBudgetSec) {
    if (!row || organicBudgetSec <= 0) return 0;
    const consumePerCycle = Number(row.organicReduceAppliedSec) || 0;
    if (consumePerCycle <= 0) return Infinity;
    return (organicBudgetSec / consumePerCycle) * row.cycleOrganic;
}

function bindSkillControls() {
    const normalToggle = document.getElementById('skillFertilizer');
    const organicToggle = document.getElementById('skillOrganicFertilizer');
    const organicSettings = document.getElementById('organicSettings');
    if (!normalToggle || !organicToggle || !organicSettings) return;

    const syncUI = () => {
        const useOrganic = organicToggle.checked;
        organicSettings.style.display = useOrganic ? '' : 'none';
        if (useOrganic) {
            normalToggle.checked = true;
            normalToggle.disabled = true;
            normalToggle.parentElement.classList.add('is-disabled');
        } else {
            normalToggle.disabled = false;
            normalToggle.parentElement.classList.remove('is-disabled');
        }
        setRankingModeVisibility(useOrganic);
    };

    organicToggle.addEventListener('change', syncUI);
    normalToggle.addEventListener('change', () => {
        if (organicToggle.checked && !normalToggle.checked) {
            normalToggle.checked = true;
        }
    });
    syncUI();
}

function setRankingModeVisibility(useOrganic) {
    const tabNoFert = document.getElementById('tabNoFert');
    const tabFert = document.getElementById('tabFert');
    const tabOrganic = document.getElementById('tabOrganic');
    if (!tabNoFert || !tabFert || !tabOrganic) return;

    if (useOrganic) {
        tabNoFert.style.display = 'none';
        tabFert.style.display = 'none';
        tabOrganic.style.display = '';
        currentRankTab = 'organic';
        document.querySelectorAll('.clay-tab').forEach(t => t.classList.remove('active'));
        tabOrganic.classList.add('active');
    } else {
        tabNoFert.style.display = '';
        tabFert.style.display = '';
        tabOrganic.style.display = 'none';
        if (currentRankTab === 'organic') currentRankTab = 'noFert';
        document.querySelectorAll('.clay-tab').forEach(t => t.classList.remove('active'));
        const activeBtn = currentRankTab === 'fert' ? tabFert : tabNoFert;
        activeBtn.classList.add('active');
    }
}

function calcOrganicByPhases(phaseDurations, organicReduceSec) {
    if (!Array.isArray(phaseDurations) || phaseDurations.length === 0 || organicReduceSec <= 0) {
        return { reducedSec: 0, useCount: 0 };
    }

    let budget = organicReduceSec;
    let reducedSec = 0;
    let useCount = 0;

    for (const phaseSec of phaseDurations) {
        if (budget <= 0) break;
        if (phaseSec <= 0) continue;

        if (budget >= phaseSec) {
            reducedSec += phaseSec;
            budget -= phaseSec;
            useCount += 1;
            continue;
        }

        // 预算不足一个完整阶段时，仍需施一次有机肥来吃掉本阶段剩余时间
        reducedSec += budget;
        useCount += 1;
        budget = 0;
    }

    return { reducedSec, useCount };
}

// ========== 核心计算 ==========
function buildRows(lands, level, organicReduceSec = 0) {
    const plantSecNoFert = lands / NO_FERT_PLANT_SPEED;
    const plantSecFert = lands / NORMAL_FERT_PLANT_SPEED;
    const fertActionSec = lands * FERT_OPERATION_SEC_PER_LAND;
    const rows = [];

    for (const s of seedData) {
        const seedId = Number(s.seedId || s.seed_id) || 0;
        const name = s.name || `seed_${seedId}`;
        const requiredLevel = Number(s.requiredLevel || s.required_level || 1) || 1;
        const price = Number(s.price) || 0;
        const exp = Number(s.exp) || 0;
        const growTimeSec = Number(s.growTimeSec || s.growTime || s.grow_time || 0) || 0;
        const seasons = Number(s.seasons) || 1;

        if (seedId <= 0 || growTimeSec <= 0) continue;
        if (level && requiredLevel > level) continue;

        const fullPhases = plantPhaseDurationsMap[seedId] || [];
        const reduceSec = plantPhaseMap[seedId] || 0;
        const growTimeFert = Math.max(1, growTimeSec - reduceSec);

        // 普通肥后，按阶段模拟有机肥：每次只清当前阶段，进入下一阶段后需再次施肥
        const phasesAfterNormal = fullPhases.length > 1 ? fullPhases.slice(1) : [growTimeFert];
        const organicResult = calcOrganicByPhases(phasesAfterNormal, organicReduceSec);
        const growTimeOrganic = Math.max(1, growTimeFert - organicResult.reducedSec);

        const cycleNoFert = growTimeSec + plantSecNoFert;
        const cycleFert = growTimeFert + plantSecFert + fertActionSec; // 普通肥 1 次操作
        const cycleOrganic = growTimeOrganic + plantSecFert + fertActionSec + (organicResult.useCount * fertActionSec);

        const expPerHourNoFert = (lands * exp / cycleNoFert) * 3600;
        const expPerHourFert = (lands * exp / cycleFert) * 3600;
        const expPerHourOrganic = (lands * exp / cycleOrganic) * 3600;
        const gainPercent = expPerHourNoFert > 0
            ? ((expPerHourFert - expPerHourNoFert) / expPerHourNoFert) * 100
            : 0;
        const organicGainPercent = expPerHourFert > 0
            ? ((expPerHourOrganic - expPerHourFert) / expPerHourFert) * 100
            : 0;

        rows.push({
            seedId,
            name,
            requiredLevel,
            price,
            exp,
            growTimeSec,
            growTimeStr: s.growTimeStr || formatSec(growTimeSec),
            seasons,
            reduceSec,
            growTimeFert,
            growTimeFertStr: formatSec(growTimeFert),
            growTimeOrganic,
            growTimeOrganicStr: formatSec(growTimeOrganic),
            organicUseCount: organicResult.useCount,
            organicReduceAppliedSec: organicResult.reducedSec,
            cycleNoFert,
            cycleFert,
            cycleOrganic,
            expPerHourNoFert,
            expPerHourFert,
            expPerHourOrganic,
            expPerDayNoFert: expPerHourNoFert * 24,
            expPerDayFert: expPerHourFert * 24,
            expPerDayOrganic: expPerHourOrganic * 24,
            gainPercent,
            organicGainPercent,
        });
    }

    return rows;
}

// ========== 计算入口 ==========
function calculate() {
    const level = Math.max(1, Math.min(100, parseInt(document.getElementById('inputLevel').value) || 27));
    const lands = Math.max(1, parseInt(document.getElementById('inputLands').value) || 24);
    const useOrganic = document.getElementById('skillOrganicFertilizer').checked;
    const useFert = document.getElementById('skillFertilizer').checked || useOrganic;
    const organicMinutes = Math.max(0, parseInt(document.getElementById('inputOrganicMinutes').value) || 0);
    const organicReduceSec = useOrganic ? organicMinutes * 60 : 0;

    calculatedRows = buildRows(lands, level, organicReduceSec);

    const placeholder = document.getElementById('cardPlaceholder');

    if (calculatedRows.length === 0) {
        if (seedData.length === 0) {
            showToast(
                '⚠️ 种子数据尚未加载成功，无法计算。\n\n' +
                '请通过「本地服务器」打开本页面（不要直接双击 index.html）。\n\n' +
                '例如：用 nginx 配置根目录为本文件夹后访问 http://localhost/ ，或使用 VS Code 的 Live Server 打开。'
            );
        } else {
            showToast('当前等级下没有可用的作物数据，请检查输入的等级（Lv1~100）或刷新页面重试。');
        }
        if (placeholder) placeholder.style.display = '';
        return;
    }

    // 有结果时隐藏引导占位
    if (placeholder) placeholder.style.display = 'none';

    // 排序
    const sortedNoFert = [...calculatedRows].sort((a, b) => b.expPerHourNoFert - a.expPerHourNoFert);
    const sortedFert = [...calculatedRows].sort((a, b) => b.expPerHourFert - a.expPerHourFert);
    const sortedOrganic = [...calculatedRows].sort((a, b) => b.expPerHourOrganic - a.expPerHourOrganic);

    const bestNo = sortedNoFert[0];
    const bestFert = sortedFert[0];
    const bestOrganic = sortedOrganic[0];

    if (!useOrganic) {
        // 渲染不施肥推荐
        const cardNoFert = document.getElementById('cardNoFert');
        cardNoFert.style.display = '';
        cardNoFert.classList.add('fade-in');
        document.getElementById('noFertName').innerHTML = `${getCropImage(bestNo.seedId, bestNo.name, 36)} ${bestNo.name}`;
        document.getElementById('noFertExpH').textContent = bestNo.expPerHourNoFert.toFixed(2);
        document.getElementById('noFertExpD').textContent = Math.round(bestNo.expPerDayNoFert).toLocaleString();
        document.getElementById('noFertGrow').textContent = bestNo.growTimeStr;
        document.getElementById('noFertLv').textContent = `Lv ${bestNo.requiredLevel}`;
    } else {
        document.getElementById('cardNoFert').style.display = 'none';
    }

    // 渲染施肥推荐
    if (useFert && !useOrganic) {
        const cardFert = document.getElementById('cardFert');
        cardFert.style.display = '';
        cardFert.classList.add('fade-in');
        document.getElementById('fertName').innerHTML = `${getCropImage(bestFert.seedId, bestFert.name, 36)} ${bestFert.name}`;
        document.getElementById('fertExpH').textContent = bestFert.expPerHourFert.toFixed(2);
        document.getElementById('fertExpD').textContent = Math.round(bestFert.expPerDayFert).toLocaleString();
        document.getElementById('fertGrow').textContent = bestFert.growTimeFertStr;
        document.getElementById('fertGain').textContent = `+${bestFert.gainPercent.toFixed(2)}%`;
    } else {
        document.getElementById('cardFert').style.display = 'none';
    }

    // 渲染有机肥推荐
    if (useOrganic) {
        const cardOrganic = document.getElementById('cardOrganic');
        const organicSupportSec = estimateOrganicSupportSec(bestOrganic, organicReduceSec);
        cardOrganic.style.display = '';
        cardOrganic.classList.add('fade-in');
        document.getElementById('organicName').innerHTML = `${getCropImage(bestOrganic.seedId, bestOrganic.name, 36)} ${bestOrganic.name}`;
        document.getElementById('organicExpH').textContent = bestOrganic.expPerHourOrganic.toFixed(2);
        document.getElementById('organicExpD').textContent = Math.round(bestOrganic.expPerDayOrganic).toLocaleString();
        document.getElementById('organicGrow').textContent = bestOrganic.growTimeOrganicStr;
        document.getElementById('organicGain').textContent = `+${bestOrganic.organicGainPercent.toFixed(2)}%`;
        document.getElementById('organicSupport').textContent = formatDuration(organicSupportSec);
    } else {
        document.getElementById('cardOrganic').style.display = 'none';
    }

    // 渲染进度条对比（Top 5）
    renderProgressBars(sortedNoFert, sortedFert, sortedOrganic, useFert, useOrganic);

    // 每日与升级预估（含每日其他经验 4100），支持选前3名方案
    const cardDaily = document.getElementById('cardDailyUpgrade');
    if (cardDaily) {
        cardDaily.style.display = '';
        cardDaily.classList.add('fade-in');
    }
    const sortedForDaily = useOrganic ? sortedOrganic : (useFert ? sortedFert : sortedNoFert);
    const dailyTop3 = sortedForDaily.slice(0, 3);
    window.__dailyTop3 = dailyTop3;
    window.__dailyLands = lands;
    window.__dailyUseFert = useFert;
    window.__dailyUseOrganic = useOrganic;
    const selRank = document.getElementById('selectDailyRank');
    if (selRank) {
        selRank.innerHTML = dailyTop3.map((row, i) => {
            const name = row.name || ('作物' + (i + 1));
            return `<option value="${i}">第${i + 1}名 ${name}</option>`;
        }).join('');
        selRank.onchange = updateDailyByRank;
    }
    function fillDailyCard(row) {
        if (!row) return;
        const dailyPlant = useOrganic ? row.expPerDayOrganic : (useFert ? row.expPerDayFert : row.expPerDayNoFert);
        const dailyTotal = Math.round(dailyPlant) + EXP_DAILY_OTHER;
        document.getElementById('dailyPlantExp').textContent = Math.round(dailyPlant).toLocaleString();
        document.getElementById('dailyTotalExp').textContent = dailyTotal.toLocaleString();
        const harvestOnce = lands * (row.exp || 0);
        document.getElementById('harvestOnceExp').textContent = harvestOnce.toLocaleString() + '（' + lands + ' 块 × ' + (row.exp || 0) + '）';
        const expToNext = getExpToNextFromInputs();
        const elUpgrade = document.getElementById('upgradeEstimate');
        let upgradeText = '填写「当前经验」和「升到下一级所需总经验」后显示';
        if (Number.isFinite(expToNext) && expToNext > 0) {
            const harvestsToUp = harvestOnce > 0 ? Math.ceil(expToNext / harvestOnce) : '-';
            const daysToUp = dailyTotal > 0 ? (Math.ceil(expToNext / dailyTotal) + ' 天') : '-';
            upgradeText = '约再收获 ' + harvestsToUp + ' 次可升级，约 ' + daysToUp + ' 可升级';
        } else if (Number.isFinite(expToNext) && expToNext === 0) {
            upgradeText = '已到升级线，可升级';
        }
        if (elUpgrade) elUpgrade.textContent = upgradeText;
    }
    fillDailyCard(dailyTop3[0]);

    setRankingModeVisibility(useOrganic);
    // 渲染排行榜
    renderRanking();

    // 提示计算完成
    const fertText = useFert ? '开启' : '关闭';
    const plantSecNo = (lands / NO_FERT_PLANT_SPEED).toFixed(1);
    const plantSecFert = (lands / NORMAL_FERT_PLANT_SPEED).toFixed(1);
    let msg = `📋 计算条件：Lv${level} · ${lands}块地 · 肥料${fertText}\n`;
    msg += `⏱️ 种植速度：不施肥 ${NO_FERT_PLANTS_PER_2_SEC}块/2秒，施肥 ${NORMAL_FERT_PLANTS_PER_2_SEC}块/2秒\n`;
    msg += `🏡 整场种完：不施肥 ${plantSecNo}秒，施肥 ${plantSecFert}秒\n`;
    msg += `🧪 肥料效果：减少一个生长阶段；每次施肥每块地增加 100ms 操作间隔\n`;
    if (useOrganic) {
        const organicSupportSec = estimateOrganicSupportSec(bestOrganic, organicReduceSec);
        msg += `🌿 有机肥：额外扣时 ${organicMinutes} 分钟（在普通肥后生效，按阶段重复施肥）\n`;
        msg += `📏 对比口径：同样单位时间内，仅比较“都使用有机肥”时各作物效率\n`;
        msg += `⌛ 当前有机肥预计可持续操作：${formatDuration(organicSupportSec)}\n`;
    }
    msg += `📊 共分析 ${calculatedRows.length} 种可用作物\n`;
    if (useOrganic) {
        msg += `\n🌿 有机肥最优：${getCropEmoji(bestOrganic.name)} ${bestOrganic.name}（${bestOrganic.expPerHourOrganic.toFixed(2)} exp/h · 相对普通肥 ↑${bestOrganic.organicGainPercent.toFixed(1)}% · 有机肥约 ${bestOrganic.organicUseCount} 次/轮）`;
    } else {
        msg += `🌾 不施肥最优：${getCropEmoji(bestNo.name)} ${bestNo.name}（${bestNo.expPerHourNoFert.toFixed(2)} exp/h）`;
        if (useFert) {
            msg += `\n🧪 施肥最优：${getCropEmoji(bestFert.name)} ${bestFert.name}（${bestFert.expPerHourFert.toFixed(2)} exp/h · ↑${bestFert.gainPercent.toFixed(1)}%）`;
        }
    }
    msg += `\n⚠️ 多季作物的计算方式暂未确定，结果仅供参考`;
    showToast(msg);
}

// ========== 进度条 ==========
function renderProgressBars(sortedNoFert, sortedFert, sortedOrganic, useFert, useOrganic) {
    const container = document.getElementById('progressBars');
    const card = document.getElementById('cardProgress');
    card.style.display = '';
    card.classList.add('fade-in');

    const colors = ['fill-green', 'fill-orange', 'fill-purple', 'fill-blue', 'fill-pink'];

    function buildGroup(title, list, key) {
        const top5 = list.slice(0, 5);
        const maxExp = top5[0] ? top5[0][key] : 1;
        let html = `<div class="progress-group-title">${title}</div>`;
        top5.forEach((r, i) => {
            const exp = r[key];
            const pct = (exp / maxExp * 100).toFixed(1);
            html += `
            <div class="progress-row">
                <span class="progress-label">${getCropImage(r.seedId, r.name, 24)} ${r.name}</span>
                <div class="progress-track">
                    <div class="progress-fill ${colors[i]}" style="width: ${pct}%">${pct}%</div>
                </div>
                <span class="progress-value">${exp.toFixed(2)} /h</span>
            </div>`;
        });
        return html;
    }

    let html = '';
    if (useOrganic) {
        html = buildGroup('🌿 有机肥 Top 5（同样单位时间）', sortedOrganic, 'expPerHourOrganic');
    } else {
        html = buildGroup('🌾 不施肥 Top 5', sortedNoFert, 'expPerHourNoFert');
        if (useFert) {
            html += `<div class="progress-divider"></div>`;
            html += buildGroup('🧪 施肥 Top 5', sortedFert, 'expPerHourFert');
        }
    }
    container.innerHTML = html;
}

// ========== 排行榜 ==========
function switchRankTab(tab, btn) {
    currentRankTab = tab;
    document.querySelectorAll('.clay-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    renderRanking();
}

function renderRanking() {
    const body = document.getElementById('rankingBody');
    let key = 'expPerHourNoFert';
    if (currentRankTab === 'fert') key = 'expPerHourFert';
    if (currentRankTab === 'organic') key = 'expPerHourOrganic';
    const sorted = [...calculatedRows].sort((a, b) => b[key] - a[key]).slice(0, 20);
    const maxExp = sorted[0] ? sorted[0][key] : 1;

    if (sorted.length === 0) {
        body.innerHTML = `
        <div class="ranking-empty">
            <div style="font-size:2.5rem;margin-bottom:12px;">🏆</div>
            <p style="color:#a08d7d;font-size:0.95rem;">请先进行经验计算<br>排行榜将根据计算结果生成</p>
        </div>`;
        return;
    }

    let html = '';
    sorted.forEach((r, i) => {
        const rank = i + 1;
        const rankClass = rank <= 3 ? `rank-${rank}` : '';
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
        const exp = r[key];
        const pct = (exp / maxExp * 100).toFixed(1);
        let growStr = r.growTimeStr;
        if (currentRankTab === 'fert') growStr = r.growTimeFertStr;
        if (currentRankTab === 'organic') growStr = r.growTimeOrganicStr;

        html += `
        <div class="ranking-row">
            <span class="rank-num ${rankClass}">${medal}</span>
            <span class="rank-name">${getCropImage(r.seedId, r.name, 24)} ${r.name}</span>
            <span class="rank-level">Lv${r.requiredLevel}</span>
            <span class="rank-grow">${growStr}</span>
            <span class="rank-exp">${exp.toFixed(2)}</span>
            <div class="rank-bar-wrap"><div class="rank-bar-fill" style="width:${pct}%"></div></div>
        </div>`;
    });
    body.innerHTML = html;
}

// ========== 作物图鉴 ==========
function renderCatalog() {
    const grid = document.getElementById('catalogGrid');
    const search = (document.getElementById('catalogSearch').value || '').trim().toLowerCase();
    const seasonFilter = document.getElementById('catalogSeason').value;

    let items = seedData.filter(s => {
        const name = (s.name || '').toLowerCase();
        if (search && !name.includes(search)) return false;
        if (seasonFilter !== 'all' && String(s.seasons) !== seasonFilter) return false;
        return true;
    });

    let html = '';
    items.forEach(s => {
        const name = s.name || '';
        const emoji = getCropEmoji(name);
        const seasons = Number(s.seasons) || 1;
        const seasonText = seasons === 1 ? '一季' : '二季';

        const seedId = Number(s.seedId) || 0;
        html += `
        <div class="catalog-item">
            <div class="catalog-emoji">${getCropImage(seedId, name, 48)}</div>
            <div class="catalog-name">${name}</div>
            <div class="catalog-meta">
                <span class="catalog-tag">Lv ${s.requiredLevel}</span>
                <span class="catalog-tag tag-season">${seasonText}</span>
                <span class="catalog-tag tag-price">💰 ${s.price}</span>
            </div>
            <div class="catalog-detail">
                <strong>经验:</strong> ${s.exp} &nbsp;
                <strong>生长:</strong> ${s.growTimeStr || formatSec(s.growTimeSec)}<br>
                <strong>产量:</strong> ${s.fruitCount || '-'}
            </div>
        </div>`;
    });

    grid.innerHTML = html || '<p style="text-align:center;color:#a08d7d;grid-column:1/-1;">没有找到匹配的作物</p>';
}

function filterCatalog() {
    renderCatalog();
}

// 切换「每日与升级预估」为经验效率前3名中的某一方案时更新显示
function updateDailyByRank() {
    const top3 = window.__dailyTop3;
    const lands = window.__dailyLands;
    const useFert = window.__dailyUseFert;
    const useOrganic = window.__dailyUseOrganic;
    if (!top3 || !top3.length) return;
    const sel = document.getElementById('selectDailyRank');
    const idx = Math.min(Math.max(0, parseInt(sel && sel.value, 10) || 0), top3.length - 1);
    const row = top3[idx];
    if (!row) return;
    const dailyPlant = useOrganic ? row.expPerDayOrganic : (useFert ? row.expPerDayFert : row.expPerDayNoFert);
    const dailyTotal = Math.round(dailyPlant) + EXP_DAILY_OTHER;
    document.getElementById('dailyPlantExp').textContent = Math.round(dailyPlant).toLocaleString();
    document.getElementById('dailyTotalExp').textContent = dailyTotal.toLocaleString();
    const harvestOnce = lands * (row.exp || 0);
    document.getElementById('harvestOnceExp').textContent = harvestOnce.toLocaleString() + '（' + lands + ' 块 × ' + (row.exp || 0) + '）';
    const expToNext = getExpToNextFromInputs();
    const elUpgrade = document.getElementById('upgradeEstimate');
    let upgradeText = '填写「当前经验」和「升到下一级所需总经验」后显示';
    if (Number.isFinite(expToNext) && expToNext > 0) {
        const harvestsToUp = harvestOnce > 0 ? Math.ceil(expToNext / harvestOnce) : '-';
        const daysToUp = dailyTotal > 0 ? (Math.ceil(expToNext / dailyTotal) + ' 天') : '-';
        upgradeText = '约再收获 ' + harvestsToUp + ' 次可升级，约 ' + daysToUp + ' 可升级';
    } else if (Number.isFinite(expToNext) && expToNext === 0) {
        upgradeText = '已到升级线，可升级';
    }
    if (elUpgrade) elUpgrade.textContent = upgradeText;
}

// 解析数字输入（支持带逗号、空格的粘贴，如 12,500）
function parseExpInput(el) {
    if (!el || !el.value || String(el.value).trim() === '') return NaN;
    const num = parseInt(String(el.value).replace(/[\s,，]/g, ''), 10);
    return Number.isFinite(num) ? num : NaN;
}

// 根据「当前经验」和「升到下一级所需总经验」计算还需多少经验
// 若第二框填的是「还需经验」而非总经验线，也支持：当 所需总经验 <= 当前经验 时按「还需」处理
function getExpToNextFromInputs() {
    const elCurrent = document.getElementById('inputCurrentExp');
    const elRequired = document.getElementById('inputExpRequiredForNext');
    const current = parseExpInput(elCurrent);
    const required = parseExpInput(elRequired);

    if (Number.isFinite(required) && !Number.isFinite(current)) {
        return required >= 0 ? required : NaN;
    }
    if (!Number.isFinite(current) || !Number.isFinite(required)) return NaN;
    if (required > current) return required - current;
    return Math.max(0, required);
}

// ========== 化肥续航计算 ==========
function fillFertCropSelect() {
    const sel = document.getElementById('selectFertCrop');
    if (!sel) return;
    let opts = '<option value="">-- 不选，只算轮数 --</option>';
    const seen = new Set();
    for (const s of seedData) {
        const seedId = Number(s.seedId || s.seed_id) || 0;
        if (seedId <= 0) continue;
        const firstPhase = plantPhaseMap[seedId];
        if (firstPhase == null || firstPhase <= 0) continue;
        const name = (s.name || 'seed_' + seedId).trim();
        const key = seedId + '|' + name;
        if (seen.has(key)) continue;
        seen.add(key);
        const requiredLevel = Number(s.requiredLevel || s.required_level) || 1;
        opts += `<option value="${seedId}">${name} (Lv${requiredLevel})</option>`;
    }
    sel.innerHTML = opts;
}

function calcFertDuration() {
    const hoursInorganic = Math.max(0, parseFloat(document.getElementById('inputFertInorganicHours').value) || 0);
    const hoursOrganic = Math.max(0, parseFloat(document.getElementById('inputFertOrganicHours').value) || 0);
    const lands = Math.max(1, parseInt(document.getElementById('inputFertLands').value) || 24);
    const sel = document.getElementById('selectFertCrop');
    const cropSeedId = sel && sel.value ? parseInt(sel.value, 10) : 0;

    const resultEl = document.getElementById('fertDurationResult');
    resultEl.style.display = '';

    const inorganicStr = hoursInorganic > 0 ? (Math.round(hoursInorganic * 10) / 10) + ' 小时' : '0 小时';
    const organicStr = hoursOrganic > 0 ? (Math.round(hoursOrganic * 10) / 10) + ' 小时' : '0 小时';

    if (!cropSeedId) {
        document.getElementById('fertInorganicResult').textContent = '无机 ' + inorganicStr + '，选作物后显示可完成轮数';
        document.getElementById('fertOrganicResult').textContent = '有机 ' + organicStr + '，选作物后显示可完成轮数';
        document.getElementById('fertSavedGrowth').textContent = '选作物后显示';
        return;
    }

    const seed = seedData.find(s => Number(s.seedId || s.seed_id) === cropSeedId);
    if (!seed) {
        document.getElementById('fertInorganicResult').textContent = '-';
        document.getElementById('fertOrganicResult').textContent = '-';
        document.getElementById('fertSavedGrowth').textContent = '-';
        return;
    }

    const growTimeSec = Number(seed.growTimeSec || seed.growTime || seed.grow_time) || 0;
    const reduceSec = plantPhaseMap[cropSeedId] || 0;
    const growTimeFert = Math.max(1, growTimeSec - reduceSec);
    const plantSecFert = lands / NORMAL_FERT_PLANT_SPEED;
    const fertActionSec = lands * FERT_OPERATION_SEC_PER_LAND;
    const cycleFertSec = growTimeFert + plantSecFert + fertActionSec;

    const fullPhases = plantPhaseDurationsMap[cropSeedId] || [];
    const phasesAfterNormal = fullPhases.length > 1 ? fullPhases.slice(1) : [growTimeFert];
    const organicResult = calcOrganicByPhases(phasesAfterNormal, 999999);
    const growTimeOrganic = Math.max(1, growTimeFert - organicResult.reducedSec);
    const cycleOrganicSec = growTimeOrganic + plantSecFert + fertActionSec + (organicResult.useCount * fertActionSec);
    const organicConsumePerRound = organicResult.reducedSec;

    let inorganicText = inorganicStr + ' 内约可完成 ';
    if (hoursInorganic > 0) {
        const roundsInorganic = Math.floor((hoursInorganic * 3600) / cycleFertSec);
        inorganicText += roundsInorganic + ' 轮，每轮约 ' + formatDuration(cycleFertSec);
    } else {
        inorganicText += '0 轮';
    }
    document.getElementById('fertInorganicResult').textContent = inorganicText;

    let organicText = organicStr + ' 内约可完成 ';
    if (hoursOrganic > 0 && organicConsumePerRound > 0) {
        const bucketOrganicSec = hoursOrganic * 3600;
        const roundsOrganic = Math.floor(bucketOrganicSec / organicConsumePerRound);
        organicText += roundsOrganic + ' 轮，每轮约 ' + formatDuration(cycleOrganicSec);
    } else if (hoursOrganic > 0) {
        organicText += '- 轮（该作物无阶段数据）';
    } else {
        organicText += '0 轮（未填有机桶时长）';
    }
    document.getElementById('fertOrganicResult').textContent = organicText;

    const roundsInorganic = hoursInorganic > 0 ? Math.floor((hoursInorganic * 3600) / cycleFertSec) : 0;
    const savedSec = roundsInorganic * lands * reduceSec;
    document.getElementById('fertSavedGrowth').textContent = formatHours(savedSec) + '（' + roundsInorganic + ' 轮 × ' + lands + ' 地 × 首阶段 ' + formatSec(reduceSec) + '）';
}

// ========== Toast 提示框 ==========
function showToast(message) {
    // 移除已有的 toast
    const old = document.querySelector('.clay-toast-overlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.className = 'clay-toast-overlay';

    const toast = document.createElement('div');
    toast.className = 'clay-toast';

    const icon = document.createElement('div');
    icon.className = 'toast-icon';
    icon.textContent = '🎉';

    const title = document.createElement('div');
    title.className = 'toast-title';
    title.textContent = '计算完成';

    const msg = document.createElement('div');
    msg.className = 'toast-message';
    msg.innerHTML = message.replace(/\n/g, '<br>');

    const btn = document.createElement('button');
    btn.className = 'toast-btn';
    btn.textContent = '🌟 太棒了！';
    btn.onclick = () => {
        toast.classList.add('toast-out');
        overlay.classList.add('overlay-out');
        setTimeout(() => overlay.remove(), 300);
    };

    toast.appendChild(icon);
    toast.appendChild(title);
    toast.appendChild(msg);
    toast.appendChild(btn);
    overlay.appendChild(toast);
    document.body.appendChild(overlay);

    // 点击遮罩关闭
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            toast.classList.add('toast-out');
            overlay.classList.add('overlay-out');
            setTimeout(() => overlay.remove(), 300);
        }
    });
}

// ========== 启动 ==========
document.addEventListener('DOMContentLoaded', init);
