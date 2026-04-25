import { motion } from "framer-motion";
import { ArrowLeft, Scale, FileText, UserCheck, AlertTriangle, ShieldCheck, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSeo } from "@/hooks/useSeo";

const Terms = () => {
  const navigate = useNavigate();
  useSeo({ 
    title: "Terms of Service", 
    description: "Review the terms and conditions for using Movi Bay." 
  });

  return (
    <div className="min-h-screen bg-[hsl(230,18%,5%)] text-white/90 selection:bg-primary/30">
      {/* Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-secondary/20 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 md:py-20">
        {/* Header */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate("/auth");
            }
          }}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-8 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back</span>
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-bold uppercase tracking-wider mb-6">
            <Scale className="w-3 h-3" />
            Terms of Service
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">
            Terms of Service
          </h1>
          <p className="text-white/40 text-lg">
            Last Updated: April 25, 2026
          </p>
        </motion.div>

        {/* Content */}
        <div className="space-y-12">
          <Section 
            icon={<FileText className="w-5 h-5" />}
            title="1. Acceptance of Terms"
            content="By creating an account or otherwise accessing the Movi Bay platform, you agree to be bound by these Terms of Service ('Terms'). These Terms constitute a legally binding agreement between you and Movi Bay. If you do not agree to these Terms, you may not access or use the Service."
          />

          <Section 
            icon={<UserCheck className="w-5 h-5" />}
            title="2. User Eligibility and Registration"
            content={
              <div className="space-y-4">
                <p>To use our Service, you must be at least 13 years of age. By registering, you represent and warrant that:</p>
                <ul className="list-disc pl-5 space-y-2 text-white/60">
                  <li>The information provided is accurate and current.</li>
                  <li>You are responsible for maintaining the confidentiality of your credentials.</li>
                  <li>You will not use the Service for any illegal or unauthorized purpose.</li>
                  <li>You will not attempt to circumvent any geographical restrictions applied to content.</li>
                </ul>
              </div>
            }
          />

          <Section 
            icon={<ShieldCheck className="w-5 h-5" />}
            title="3. Intellectual Property Rights"
            content="The Service and its original content (excluding content provided by users), features, and functionality are and will remain the exclusive property of Movi Bay and its licensors. Our trademarks and trade dress may not be used in connection with any product or service without our prior written consent."
          />

          <Section 
            icon={<AlertTriangle className="w-5 h-5" />}
            title="4. Prohibited Content and Conduct"
            content={
              <div className="space-y-4">
                <p>You are expressly prohibited from:</p>
                <ul className="list-disc pl-5 space-y-2 text-white/60">
                  <li>Extracting, downloading (unless permitted), or reverse-engineering any content from the platform.</li>
                  <li>Using the service for commercial purposes without a specific license.</li>
                  <li>Engaging in any activity that disrupts or interferes with the Service servers or networks.</li>
                  <li>Impersonating another user or entity.</li>
                </ul>
              </div>
            }
          />

          <Section 
            icon={<Scale className="w-5 h-5" />}
            title="5. Limitation of Liability"
            content="In no event shall Movi Bay, nor its directors, employees, or partners, be liable for any indirect, incidental, special, or consequential damages resulting from your use of or inability to use the Service. We provide the platform 'as is' without warranties of any kind, express or implied."
          />

          <Section 
            icon={<ArrowLeft className="w-5 h-5" />}
            title="6. Termination"
            content="We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms."
          />

          <Section 
            icon={<Globe className="w-5 h-5" />}
            title="7. Governing Law"
            content="These Terms shall be governed and construed in accordance with the laws of the Republic of Uganda, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights."
          />

          <div className="pt-12 border-t border-white/5">
            <h3 className="text-xl font-bold text-white mb-4">8. Support and Inquiries</h3>
            <p className="text-white/60 mb-6">
              For any legal questions or support regarding these terms, please contact:
            </p>
            <div className="text-primary font-medium p-4 rounded-lg bg-white/[0.03] border border-white/10 inline-block">
              support@s-u.in
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Section = ({ icon, title, content }: { icon: React.ReactNode; title: string; content: React.ReactNode }) => (
  <motion.section
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="group"
  >
    <div className="flex items-center gap-4 mb-4">
      <div className="w-10 h-10 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center text-secondary group-hover:bg-secondary/10 group-hover:border-secondary/20 transition-all">
        {icon}
      </div>
      <h2 className="text-xl font-bold text-white">{title}</h2>
    </div>
    <div className="pl-14 text-white/50 leading-relaxed text-base">
      {content}
    </div>
  </motion.section>
);

export default Terms;
