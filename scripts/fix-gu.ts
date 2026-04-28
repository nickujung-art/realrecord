import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

async function main() {
    const { prisma } = await import("../lib/db.js");
    console.log("🧹 [v2] 창원 '구' 단위 데이터 정밀 세탁 시작...\n");

    const regionMapping = [
        {
            gu: "의창구",
            dongs: ["중동", "팔용동", "북면", "도계동", "명서동", "봉곡동", "사화동", "동읍", "대산면"]
        },
        {
            gu: "성산구",
            dongs: ["용호동", "반림동", "가음동", "대원동", "상남동", "사파동", "남양동", "대방동", "중앙동", "신월동", "안민동"]
        },
        {
            gu: "마산회원구",
            dongs: ["양덕동", "합성동", "구암동", "회성동", "내서읍", "석전동", "회원동"]
        },
        {
            gu: "마산합포구",
            dongs: ["월영동", "해운동", "산호동", "오동동", "자산동", "교방동", "현동", "진동면"]
        },
        {
            gu: "진해구",
            dongs: ["석동", "자은동", "풍호동", "경화동", "용원동", "남문동", "청안동", "여좌동"]
        }
    ];

    for (const mapping of regionMapping) {
        const result = await prisma.apartmentComplex.updateMany({
            where: {
                dong: { in: mapping.dongs },
                city: { contains: "창원" }
            },
            data: {
                city: `창원시 ${mapping.gu}`,
                district: mapping.gu
            }
        });
        console.log(`✅ ${mapping.gu}: ${result.count}개 단지 업데이트 완료`);
    }

    console.log("\n✨ 이제 유니시티도 '의창구'로 잘 나올 겁니다!");
    await prisma.$disconnect();
}

main().catch(console.error);