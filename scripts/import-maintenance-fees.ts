import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import fs from "fs";
import * as XLSX from "xlsx";

async function importGyeongnamFeesFinalSuccess() {
    const { prisma } = await import("../lib/db");
    const excelPath = "scripts/kapt_gyeongnam_2025.xlsx";

    if (!fs.existsSync(excelPath)) return;

    console.log("📂 엑셀 로드 중...");
    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const records = XLSX.utils.sheet_to_json(sheet) as any[];

    const allComplexes = await prisma.apartmentComplex.findMany({
        where: { kaptCode: { not: null } },
        select: { id: true, kaptCode: true }
    });

    const complexMap = new Map(
        allComplexes.map(c => [c.kaptCode?.toString().toUpperCase().trim(), c.id])
    );

    let successCount = 0;
    let errorCount = 0;

    console.log(`🚀 적재 시작 (총 ${records.length}건)...`);

    for (const row of records) {
        try {
            const excelCode = row["단지코드"]?.toString().toUpperCase().trim();
            const complexId = complexMap.get(excelCode);

            if (!complexId) continue;

            const yearMonth = String(row["발생년월(YYYYMM)"] || "").trim();

            const commonWon = Math.floor(Number(row["공용관리비계"] || 0));
            const individualWon = Math.floor(Number(row["개별사용료계"] || 0));
            const totalWon = commonWon + individualWon;

            // 💡 [최종] DB 스키마에 존재하는 필드만 정확히 매핑했습니다.
            await prisma.maintenanceFee.upsert({
                where: {
                    complexId_yearMonth: { complexId, yearMonth }
                },
                update: {
                    communalFeeWon: commonWon,
                    indivFeeWon: individualWon,
                    totalFeeWon: totalWon,
                },
                create: {
                    complexId,
                    yearMonth,
                    communalFeeWon: commonWon,
                    indivFeeWon: individualWon,
                    totalFeeWon: totalWon,
                }
            });

            successCount++;
            if (successCount % 100 === 0) process.stdout.write(".");
        } catch (err: any) {
            errorCount++;
            if (errorCount === 1) {
                console.log("\n❌ 예상치 못한 에러 발생:");
                console.error(err.message);
            }
        }
    }

    console.log("\n===========================================");
    console.log(`✅ 최종 적재 성공: ${successCount}건`);
    console.log(`❌ 실패: ${errorCount}건`);
    console.log("===========================================");
}

importGyeongnamFeesFinalSuccess().then(() => prisma.$disconnect());