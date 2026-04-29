import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

async function checkHealth() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('❌ DATABASE_URL이 없습니다.');
        return;
    }

    const pool = new pg.Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    try {
        console.log('📊 리얼레코드 데이터 건강검진 시작...\n');

        const total = await prisma.apartmentComplex.count();

        // 1. 좌표 데이터 (필드 존재 확인)
        const withGeo = await prisma.apartmentComplex.count({
            where: { latitude: { not: null }, longitude: { not: null } }
        });

        // 2. 학교 데이터 (schoolInfos 관계가 하나라도 있는지 확인)
        const withSchools = await prisma.apartmentComplex.count({
            where: { schoolInfos: { some: {} } }
        });

        // 3. 전세/갭 데이터 (rentRecords 관계가 하나라도 있는지 확인)
        const withGapPrice = await prisma.apartmentComplex.count({
            where: { rentRecords: { some: {} } }
        });

        // 4. 주차 데이터 (필드 존재 확인)
        const withParking = await prisma.apartmentComplex.count({
            where: { parkingCount: { not: null } }
        });

        const percent = (count: number) => ((Number(count) / Number(total)) * 100).toFixed(1);

        console.log(`✅ 전체 단지 수: ${total}건`);
        console.log(`📍 좌표 등록(지도 표시 가능): ${withGeo}건 (${percent(withGeo)}%)`);
        console.log(`🏫 학교 매칭(교육 점수): ${withSchools}건 (${percent(withSchools)}%)`);
        console.log(`💰 전세 데이터 보유(갭 가격 가능): ${withGapPrice}건 (${percent(withGapPrice)}%)`);
        console.log(`🚗 주차 정보 보유: ${withParking}건 (${percent(withParking)}%)\n`);

        if (Number(withGapPrice) < Number(total) * 0.4) {
            console.log('⚠️ 경고: 전세 데이터 수집이 더 필요합니다.');
        } else {
            console.log('✨ 상태 양호: 데이터가 정상적으로 쌓이고 있습니다.');
        }

    } catch (error) {
        console.error('❌ 데이터 조회 중 에러 발생:', error);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

checkHealth();