// scripts/fetch-secondary-schools.ts
import axios from 'axios';

// 두 좌표 사이의 거리(m)를 계산하는 함수
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // 지구 반지름(km)
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // m 단위
}

async function fetchSecondarySchools() {
    const { prisma } = await import('../lib/db');
    const NEIS_API_KEY = process.env.NEIS_API_KEY;
    const KAKAO_API_KEY = process.env.KAKAO_REST_API_KEY;

    const schoolLevels = [
        { code: '03', name: '중학교' },
        { code: '04', name: '고등학교' }
    ];

    // 1. 모든 아파트 단지 정보 가져오기 (거리 계산용)
    const complexes = await prisma.apartmentComplex.findMany({
        select: { id: true, name: true, latitude: true, longitude: true }
    });

    for (const level of schoolLevels) {
        console.log(`\n📡 ${level.name} 수집 및 단지 매칭 시작...`);

        try {
            const response = await axios.get(`https://open.neis.go.kr/hub/schoolInfo`, {
                params: {
                    KEY: NEIS_API_KEY, Type: 'json', pIndex: 1, pSize: 1000,
                    ATPT_OFCDC_SC_CODE: 'S10', SCHUL_KND_SC_CODE: level.code
                }
            });

            const schools = response.data.schoolInfo?.[1]?.row || [];

            for (const school of schools) {
                try {
                    // 2. 학교 좌표 수집
                    const geoRes = await axios.get(`https://dapi.kakao.com/v2/local/search/address.json`, {
                        params: { query: school.ORG_RDNMA },
                        headers: { Authorization: `KakaoAK ${KAKAO_API_KEY}` }
                    });

                    const location = geoRes.data.documents[0];
                    if (!location) continue;

                    const sLat = parseFloat(location.y);
                    const sLng = parseFloat(location.x);

                    // 3. 모든 단지와 비교하여 1.5km 이내인 경우 DB 저장
                    for (const complex of complexes) {
                        if (!complex.latitude || !complex.longitude) continue;

                        const dist = getDistance(sLat, sLng, Number(complex.latitude), Number(complex.longitude));

                        // 중고등학교는 보통 1.5km 정도까지 커버함
                        if (dist <= 1500) {
                            await prisma.schoolInfo.upsert({
                                where: {
                                    complexId_schoolName: {
                                        complexId: complex.id,
                                        schoolName: school.SCHUL_NM
                                    }
                                },
                                update: {
                                    distance: Math.round(dist),
                                    address: school.ORG_RDNMA,
                                    grade: school.COEDU_SC_NM // DB의 grade 필드에 공학여부 임시 저장
                                },
                                create: {
                                    complexId: complex.id,
                                    schoolName: school.SCHUL_NM,
                                    schoolType: level.name,
                                    address: school.ORG_RDNMA,
                                    distance: Math.round(dist),
                                    grade: school.COEDU_SC_NM // 남여공학 정보
                                }
                            });
                        }
                    }
                    console.log(`✓ ${school.SCHUL_NM} 매칭 완료`);
                    await new Promise(r => setTimeout(r, 20)); // 속도 조절

                } catch (e) { /* 개별 학교 에러 무시 */ }
            }
        } catch (e) { console.error(e); }
    }
}

fetchSecondarySchools().then(() => console.log("🎉 수집 완료!"));