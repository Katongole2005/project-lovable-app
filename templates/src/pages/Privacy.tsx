import { motion } from "framer-motion";
import { ArrowLeft, Shield, Lock, Eye, Mail, Globe, ChevronRight, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSeo } from "@/hooks/useSeo";

const Privacy = () => {
  const navigate = useNavigate();
  useSeo({ 
    title: "Privacy Policy", 
    description: "Learn how Movi Bay protects your data and privacy." 
  });

  return (
    <div className="min-h-screen bg-[hsl(230,18%,5%)] text-white/90 selection:bg-primary/30">
      {/* Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-secondary/20 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 md:py-20">
        {/* Header */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(-1)}
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-6">
            <Shield className="w-3 h-3" />
            Legal Documentation
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">
            Privacy Policy
          </h1>
          <p className="text-white/40 text-lg">
            Last Updated: April 25, 2026
          </p>
        </motion.div>

        {/* Content */}
        <div className="space-y-12">
          <Section 
            icon={<Globe className="w-5 h-5" />}
            title="1. Introduction"
            content="Movi Bay ('we,' 'us,' or 'our') operates the Movi Bay streaming platform. This Privacy Policy informs you of our policies regarding the collection, use, and disclosure of Personal Identifiable Information (PII) when you use our Service. By using the Service, you agree to the collection and use of information in accordance with this policy."
          />

          <Section 
            icon={<Eye className="w-5 h-5" />}
            title="2. Information Collection and Use"
            content={
              <div className="space-y-4">
                <p>We collect several different types of information for various purposes to provide and improve our Service to you:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
                    <h4 className="text-white font-bold mb-2">Personal Data</h4>
                    <p className="text-xs text-white/40 leading-relaxed">Email address, first name, last name, and profile identifiers provided during registration or OAuth authentication.</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
                    <h4 className="text-white font-bold mb-2">Usage Data</h4>
                    <p className="text-xs text-white/40 leading-relaxed">IP address, browser type, device identifiers, and behavioral data related to content consumption progress.</p>
                  </div>
                </div>
              </div>
            }
          />

          <Section 
            icon={<Lock className="w-5 h-5" />}
            title="3. Google OAuth & Limited Use"
            content={
              <div className="space-y-4">
                <p>Movi Bay's use and transfer to any other app of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google API Service User Data Policy</a>, including the Limited Use requirements.</p>
                <p>Specifically, we access your Google Email Address and Basic Profile (name and picture) solely to authenticate your identity and personalize your user profile. We do not use this information for advertising purposes or share it with third parties outside of our essential infrastructure providers (Supabase).</p>
              </div>
            }
          />

          <Section 
            icon={<Shield className="w-5 h-5" />}
            title="4. Data Retention and Security"
            content="We will retain your Personal Data only for as long as is necessary for the purposes set out in this Privacy Policy. We use industry-standard security measures, including SSL encryption and secure database protocols provided by Supabase, to protect your data. However, no method of transmission over the Internet is 100% secure."
          />

          <Section 
            icon={<Mail className="w-5 h-5" />}
            title="5. Third-Party Service Providers"
            content="We may employ third-party companies and individuals to facilitate our Service ('Service Providers'), such as Supabase (Database and Auth) and Vercel (Hosting). These third parties have access to your Personal Data only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose."
          />

          <Section 
            icon={<ChevronRight className="w-5 h-5" />}
            title="6. Data Deletion and Your Rights"
            content="Under GDPR and other international privacy laws, you have the right to access, rectify, or erase your personal data. You can delete your account and all associated playback history directly within your profile settings. Upon account deletion, all personal records are permanently purged from our active databases."
          />

          <Section 
            icon={<AlertTriangle className="w-5 h-5" />}
            title="7. Children's Privacy (COPPA)"
            content="Our Service does not address anyone under the age of 13 ('Children'). We do not knowingly collect personally identifiable information from anyone under the age of 13. If you are a parent or guardian and you are aware that your Children have provided us with Personal Data, please contact us."
          />

          <div className="pt-12 border-t border-white/5">
            <h3 className="text-xl font-bold text-white mb-4">8. Contact Information</h3>
            <p className="text-white/60 mb-6">
              For any privacy-related inquiries or to exercise your data rights, please contact our Data Protection Officer:
            </p>
            <a 
              href="mailto:support@movibay.ug" 
              className="inline-flex items-center gap-3 px-6 py-3 rounded-lg bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] hover:border-white/20 transition-all text-primary font-medium"
            >
              <Mail className="w-5 h-5" />
              support@movibay.ug
            </a>
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
      <div className="w-10 h-10 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center text-primary group-hover:bg-primary/10 group-hover:border-primary/20 transition-all">
        {icon}
      </div>
      <h2 className="text-xl font-bold text-white">{title}</h2>
    </div>
    <div className="pl-14 text-white/50 leading-relaxed text-base">
      {content}
    </div>
  </motion.section>
);

export default Privacy;
