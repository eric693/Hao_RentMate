"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeAllocations = computeAllocations;
const app_1 = require("../app");
// 取得據點內目前有 ACTIVE 合約的倉庫（分攤對象）
async function activeUnits(propertyId) {
    return app_1.prisma.unit.findMany({
        where: { propertyId, contracts: { some: { status: 'ACTIVE' } } },
    });
}
async function computeAllocations(propertyId, totalAmount, method, inputs) {
    const units = await activeUnits(propertyId);
    if (units.length === 0)
        return [];
    // 獨立電錶（抄表）模式：逐戶 (本期-上期)×單價，只計入有抄表的倉庫
    if (method === 'METER') {
        const inputMap = new Map(inputs.map((i) => [i.unitId, i]));
        const result = [];
        for (const u of units) {
            // 沒有獨立電錶的倉庫不收電費（即使前端誤送讀數也擋掉）
            if (!u.hasElectricMeter)
                continue;
            const input = inputMap.get(u.id);
            // 沒填本期讀數 → 此戶本期不收電費，不列入
            if (!input || input.currReading === undefined || input.currReading === null)
                continue;
            const prev = input.prevReading ?? (u.electricLastReading != null ? Number(u.electricLastReading) : 0);
            const curr = Number(input.currReading);
            const price = input.unitPrice ?? (u.electricUnitPrice != null ? Number(u.electricUnitPrice) : 0);
            const used = Math.max(0, curr - prev);
            const amount = Math.round(used * price * 100) / 100;
            result.push({
                unitId: u.id,
                unitNumber: u.unitNumber,
                amount,
                basis: used,
                prevReading: prev,
                currReading: curr,
                unitPrice: price,
            });
        }
        return result;
    }
    const usageMap = new Map(inputs.map((i) => [i.unitId, i.usage ?? 0]));
    // 計算每間的權重
    const weights = units.map((u) => {
        let w = 1;
        let basis = null;
        if (method === 'AREA') {
            basis = u.areaPing ? Number(u.areaPing) : 0;
            w = basis;
        }
        else if (method === 'HEADCOUNT') {
            basis = u.occupants ?? 1;
            w = basis;
        }
        else if (method === 'USAGE') {
            basis = usageMap.get(u.id) ?? 0;
            w = basis;
        }
        return { unit: u, weight: w, basis };
    });
    const totalWeight = weights.reduce((s, w) => s + w.weight, 0);
    // 權重全為 0（例如坪數未填）→ 退回平均分攤
    const fallbackEven = totalWeight <= 0;
    // 四捨五入到整數，最後一間吸收餘額避免加總不符
    const result = [];
    let allocated = 0;
    weights.forEach((w, idx) => {
        const isLast = idx === weights.length - 1;
        let amount;
        if (isLast) {
            amount = Math.round((totalAmount - allocated) * 100) / 100;
        }
        else {
            const share = fallbackEven ? totalAmount / weights.length : (totalAmount * w.weight) / totalWeight;
            amount = Math.round(share * 100) / 100;
            allocated += amount;
        }
        result.push({
            unitId: w.unit.id,
            unitNumber: w.unit.unitNumber,
            amount,
            basis: fallbackEven ? null : w.basis,
        });
    });
    return result;
}
