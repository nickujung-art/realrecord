// scripts/fetch-complex-area.ts
import axios from "axios";

async function fetchComplexAreaV4() {
    const { prisma } = await import("../lib/db");

    // 1. 수집 대상 단지 추출 (kaptCode가 있는 단지만)
    const complexes = await prisma.apartmentComplex.findMany({
        where: { kaptCode: { not: null } },
        select: { id: true, kaptCode: true, name: true }
    });

    console.log(`🔍 수집 대상: 총 ${complexes.length}개 단지`);

    // 💡 환경변수 이름 확인: .env 파일의 변수명과 정확히 일치해야 합니다.
    const API_KEY = process.env.PUBLIC_DATA_API_KEY;

    if (!API_KEY) {
        console.error("❌ .env 파일에 PUBLIC_DATA_API_KEY가 설정되지 않았습니다.");
        return;
    }

    // V4 최신 엔드포인트
    const BASE_URL = "https://apis.data.go.kr/1613000/AptBasisInfoServiceV4/getAphusBassInfoV4";

    let successCount = 0;

    for (const complex of complexes) {
        try {
            // 💡 Axios의 params 객체를 쓰지 않고 URL을 직접 조립 (공공데이터 API 통신 에러 방지)
            const url = `${BASE_URL}?serviceKey=${API_KEY}&kaptCode=${complex.kaptCode}&_type=json`;

            const response = await axios.get(url, { timeout: 10000 });
            const info = response.data?.response?.body?.item;

            if (info) {
                // 💡 핵심: V4 API의 키명 변경 및 데이터 타입 보정
                const rawExclusive = info.privArea;   // 주거전용면적합 (문자열로 옴)
                const rawMaintenance = info.kaptMarea; // 관리비부과면적 (숫자로 옴)

                const exclusiveArea = rawExclusive ? parseFloat(String(rawExclusive)) : null;
                const maintenanceArea = rawMaintenance ? parseFloat(String(rawMaintenance)) : null;

                // 2. DB 업데이트
                await prisma.apartmentComplex.update({
                    where: { id: complex.id },
                    data: {
                        // 전용면적이 누락되었을 경우를 대비해 부과면적을 대체값으로 사용 (안전장치)
                        exclusiveAreaSum: exclusiveArea || maintenanceArea || null,
                        maintenanceAreaSum: maintenanceArea || null
                    }
                });

                successCount++;
                console.log(`✅ [${successCount}/${complexes.length}] ${complex.name}: 전용(${exclusiveArea}㎡) / 부과(${maintenanceArea}㎡) 완료`);
            } else {
                const errMsg = response.data?.response?.header?.resultMsg || "데이터 없음";
                console.log(`⚠️ [건너뜀] ${complex.name} (kaptCode: ${complex.kaptCode}): ${errMsg}`);
            }

            // API 서버 부하(429 Too Many Requests) 방지를 위해 0.4초 대기
            await new Promise(resolve => setTimeout(resolve, 400));

        } catch (err: any) {
            console.log(`❌ [통신/서버 에러] ${complex.name}: ${err.message}`);
        }
    }

    console.log("\n===========================================");
    console.log(`🎉 면적 데이터 수집 최종 완료: ${successCount}건`);
    console.log("===========================================");
}

// 스크립트 실행 및 Prisma 연결 종료 처리
fetchComplexAreaV4()
    .then(async () => {
        const { prisma } = await import("../lib/db");
        await prisma.$disconnect();
    })
    .catch(e => {
        console.error("작업 중 치명적인 오류 발생:", e);
        process.exit(1);
    });