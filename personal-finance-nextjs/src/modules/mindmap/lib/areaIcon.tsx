import {
  Briefcase,
  HeartPulse,
  Languages,
  type LucideIcon,
  Music,
  Sparkles,
  Target,
  Users,
  Wallet,
} from 'lucide-react';

// Biểu tượng cho lĩnh vực theo từ khóa trong tên (không khớp → Target)
const RULES: [RegExp, LucideIcon][] = [
  [/anh|english|ngoại ngữ|ngôn ngữ|nhật|trung|hàn/i, Languages],
  [/sức khỏe|sức khoẻ|thể chất|thể thao|chạy|gym|health/i, HeartPulse],
  [/tài chính|tiền|đầu tư|finance/i, Wallet],
  [/sự nghiệp|công việc|career|nghề|kỹ thuật|code|lập trình/i, Briefcase],
  [/kỹ năng mềm|giao tiếp|quan hệ|gia đình|bạn bè/i, Users],
  [/âm nhạc|nhạc|đàn|music/i, Music],
  [/kỹ năng|bản thân|thói quen/i, Sparkles],
];

export function areaIcon(title: string): LucideIcon {
  return RULES.find(([re]) => re.test(title))?.[1] ?? Target;
}
