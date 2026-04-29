import { Phone, MapPin } from "lucide-react";

interface AgentCardProps {
  name: string;
  phone: string;
  tags: string[];
}

function AgentCard({ name, phone, tags }: AgentCardProps) {
  const tel = phone.replace(/-/g, "");

  return (
    <div className="card px-4 py-3.5 flex flex-col gap-3">
      <div>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full mb-1.5">
          프리미엄 중개사
        </span>
        <h3 className="text-sm font-bold text-gray-900 leading-tight">{name}</h3>
        <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
          <MapPin size={9} />
          창원 · 김해 전문 중개사
        </p>
      </div>

      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <span
            key={tag}
            className="text-[11px] px-2 py-0.5 rounded font-medium text-gray-600 bg-gray-100"
          >
            {tag}
          </span>
        ))}
      </div>

      <a
        href={`tel:${tel}`}
        className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-primary-700 hover:bg-primary-800 transition-colors duration-150"
      >
        <Phone size={12} />
        전화 연결 · {phone}
      </a>
    </div>
  );
}

const AGENTS: AgentCardProps[] = [
  {
    name: "창부이 소장",
    phone: "010-1234-5678",
    tags: ["유니시티 전문", "의창구 대장주"],
  },
  {
    name: "리얼 부동산",
    phone: "010-8765-4321",
    tags: ["율하 2지구 전문", "장유 신축"],
  },
];

export function PremiumAgents() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {AGENTS.map((agent) => (
        <AgentCard key={agent.name} {...agent} />
      ))}
    </div>
  );
}
