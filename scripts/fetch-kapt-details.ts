import axios from "axios";

async function fetchComplexArea() {
  // 1. DB 클라이언트를 동적으로 가져옴
  const { prisma } = await import("../lib/db");

  // kaptCode가 있는 경남 단지만 추출
  const complexes = await prisma.apartmentComplex.findMany({
    where: {
      kaptCode: { not: null },
      address: { contains: "경상남도" }
    },
    select: { id: true, kaptCode: true, name: true }
  });

  console.log(`🔍 대상 단지: ${complexes.length}개`);

  const API_KEY = process.env.KAPT_API_KEY;
  const API_URL = "http://apis.data.go.kr/1613000/AptBasisInfoServicev2/getAptBasicInfo";

  let successCount = 0;

  for (const complex of complexes) {
    try {
      const response = await axios.get(API_URL, {
        params: {
          serviceKey: API_KEY,
          kaptCode: complex.kaptCode,
        }
      });

      const info = response.data?.response?.body?.item;

      if (info && info.kaptAre) {
        const totalArea = parseFloat(info.kaptAre);

        // ⚠️ [중요] PM님의 schema.prisma에 있는 필드명으로 수정하세요!
        // 예: exclusiveAreaSum, totalArea 등
        await prisma.apartmentComplex.update({
          where: { id: complex.id },
          data: {
            // @ts-ignore
            exclusiveAreaSum: totalArea
          }
        });

        successCount++;
        console.log(`✅ [${successCount}/${complexes.length}] ${complex.name}: ${totalArea}㎡ 완료`);
      } else {
        console.log(`⚠️ [SKIP] ${complex.name}: 면적 정보 없음`);
      }

      // API 호출 간격 조절 (초당 5~6회 수준)
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (err) {
      console.error(`❌ ${complex.name} 처리 중 오류 발생`);
    }
  }

  console.log("\n===========================================");
  console.log(`🎉 전용면적 수집 완료: ${successCount}건`);
  console.log("===========================================");
}

fetchComplexArea()
  .then(async () => {
    const { prisma } = await import("../lib/db");
    await prisma.$disconnect();
  })
  .catch(e => console.error(e));