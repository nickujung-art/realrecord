// scripts/geocode-complexes.ts
import axios from "axios";

async function geocodeComplexes() {
    const { prisma } = await import("../lib/db");

    // 1. 좌표가 없는 단지들만 가져오기 (필드명 수정: kaptAddr -> roadAddress)
    const complexes = await prisma.apartmentComplex.findMany({
        where: {
            OR: [
                { latitude: null },
                { longitude: null }
            ]
        },
        select: {
            id: true,
            name: true,
            roadAddress: true, // DB에 있는 실제 필드명으로 변경
            city: true,
            district: true,
            dong: true
        }
    });

    console.log(`🚀 좌표 수집 시작: 총 ${complexes.length}개 단지`);

    const KAKAO_API_KEY = process.env.KAKAO_REST_API_KEY;

    if (!KAKAO_API_KEY) {
        console.error("❌ KAKAO_REST_API_KEY가 설정되지 않았습니다.");
        return;
    }

    for (const complex of complexes) {
        try {
            // 검색어 조합: 도로명 주소가 있으면 사용, 없으면 시/군/구 + 단지명으로 검색
            const searchQuery = complex.roadAddress ||
                `${complex.city || ''} ${complex.district || ''} ${complex.dong || ''} ${complex.name}`;

            const response = await axios.get(
                `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(searchQuery)}`,
                { headers: { Authorization: `KakaoAK ${KAKAO_API_KEY}` } }
            );

            let result = response.data.documents[0];

            // 주소로 검색 결과가 없으면 단지명으로 한 번 더 시도 (성공률 UP)
            if (!result) {
                const keywordResponse = await axios.get(
                    `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(complex.name)}`,
                    { headers: { Authorization: `KakaoAK ${KAKAO_API_KEY}` } }
                );
                result = keywordResponse.data.documents[0];
            }

            if (result) {
                await prisma.apartmentComplex.update({
                    where: { id: complex.id },
                    data: {
                        latitude: parseFloat(result.y),
                        longitude: parseFloat(result.x)
                    }
                });
                console.log(`✅ [${complex.name}] 매칭 완료: ${result.y}, ${result.x}`);
            } else {
                console.log(`⚠️ [${complex.name}] 검색 결과 없음 (쿼리: ${searchQuery})`);
            }

            await new Promise(r => setTimeout(r, 100));

        } catch (e: any) {
            console.error(`❌ [${complex.name}] 에러: ${e.message}`);
        }
    }
}

geocodeComplexes().then(() => console.log("🎉 모든 좌표 수집 완료!"));