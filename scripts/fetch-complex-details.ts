// scripts/fetch-complex-details.ts
import axios from "axios";

async function fetchDetailedInfoV4() {
    const { prisma } = await import("../lib/db");
    const complexes = await prisma.apartmentComplex.findMany({
        where: { kaptCode: { not: null } },
        select: { id: true, kaptCode: true, name: true }
    });

    const API_KEY = process.env.PUBLIC_DATA_API_KEY;
    const BASE_URL = "https://apis.data.go.kr/1613000/AptBasisInfoServiceV4/getAphusDtlInfoV4";

    console.log(`🚀 상세 정보 수집 시작: ${complexes.length}개 단지`);

    for (const complex of complexes) {
        try {
            const url = `${BASE_URL}?serviceKey=${API_KEY}&kaptCode=${complex.kaptCode}&_type=json`;
            const response = await axios.get(url, { timeout: 10000 });
            const info = response.data?.response?.body?.item;

            if (info) {
                // 💡 헬퍼: 문자열 숫자를 안전하게 변환
                const toNum = (val: any) => {
                    if (!val || val === " " || val === "-") return 0;
                    return parseInt(String(val).replace(/[^0-9]/g, '')) || 0;
                };

                // 💡 헬퍼: welfareFacility 문자열에서 특정 시설 포함 여부 확인
                const facilities = info.welfareFacility || "";
                const has = (keyword: string) => facilities.includes(keyword);

                await prisma.apartmentComplex.update({
                    where: { id: complex.id },
                    data: {
                        // 1. 주차 및 보안 (실제 키 이름 반영)
                        parkingCountGround: toNum(info.kaptdPcnt),       // 지상
                        parkingCountUnderground: toNum(info.kaptdPcntu), // 지하
                        cctvCount: toNum(info.kaptdCccnt),               // CCTV

                        // 2. 부대시설 (문자열 분석)
                        hasGym: has("주민공동시설") || has("헬스") || has("커뮤니티"),
                        hasLibrary: has("문고") || has("도서관"),
                        hasDaycare: has("보육시설") || has("어린이집"),
                        hasSeniorCenter: has("노인정") || has("경로당"),
                        hasPlayground: has("어린이놀이터"),

                        // 3. 나중에 전기차 충전기 등을 위해 원본 데이터 저장
                        detailedRawData: info
                    }
                });

                const totalParking = toNum(info.kaptdPcnt) + toNum(info.kaptdPcntu);
                console.log(`✅ [${complex.name}] 주차: ${totalParking}대, CCTV: ${toNum(info.kaptdCccnt)}대, 시설: ${facilities.slice(0, 20)}...`);
            }
            await new Promise(r => setTimeout(r, 400));
        } catch (e: any) {
            console.log(`❌ ${complex.name} 에러: ${e.message}`);
        }
    }
}

fetchDetailedInfoV4().then(() => console.log("🎉 수집 완료!"));