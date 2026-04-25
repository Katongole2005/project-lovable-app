import { motion } from "framer-motion";
import { ArrowLeft, Shield, Lock, Eye, Mail, Globe, ChevronRight } from "lucide-react";
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
            title="Introduction"
            content="At Movi Bay, we respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our streaming service."
          />

          <Section 
            icon={<Eye className="w-5 h-5" />}
            title="Information We Collect"
            content={
              <div className="space-y-4">
                <p>We collect information to provide a better experience to all our users. This includes:</p>
                <ul className="list-disc pl-5 space-y-2 text-white/60">
                  <li><strong className="text-white/80">Account Information:</strong> When you sign in with Google or create an account, we collect your name, email address, and profile picture.</li>
                  <li><strong className="text-white/80">Usage Data:</strong> We collect information about how you interact with our service, such as movies watched, watch progress, and device information.</li>
                  <li><strong className="text-white/80">Preferences:</strong> Your selected VJ versions, server preferences, and watchlists.</li>
                </ul>
              </div>
            }
          />

          <Section 
            icon={<Lock className="w-5 h-5" />}
            title="Google OAuth Data"
            content="When you use 'Continue with Google', we only request access to your primary Google account email address and basic profile information (name and profile picture). We use this data solely to create and manage your Movi Bay account. We do not access your contacts, drive files, or any other private Google data."
          />

          <Section 
            icon={<Shield className="w-5 h-5" />}
            title="How We Use Your Data"
            content={
              <ul className="list-disc pl-5 space-y-2 text-white/60">
                <li>To provide, maintain, and improve our streaming services.</li>
                <li>To personalize your content recommendations and 'Continue Watching' features.</li>
                <li>To communicate with you about service updates, security alerts, and support.</li>
                <li>To detect and prevent fraudulent or unauthorized activity.</li>
              </ul>
            }
          />

          <Section 
            icon={<Mail className="w-5 h-5" />}
            title="Data Sharing"
            content="We do not sell, trade, or otherwise transfer your personal data to outside parties. Your information is only shared with trusted third-party service providers (such as Supabase for database management) who assist us in operating our website, so long as those parties agree to keep this information confidential."
          />

          <Section 
            icon={<ChevronRight className="w-5 h-5" />}
            title="Your Rights"
            content="You have the right to access, update, or delete your personal information at any time. You can manage your profile settings within the app or contact us directly to request the permanent deletion of your account and all associated data."
          />

          <div className="pt-12 border-t border-white/5">
            <h3 className="text-xl font-bold text-white mb-4">Contact Us</h3>
            <p className="text-white/60 mb-6">
              If you have any questions about this Privacy Policy, please contact our legal team:
            </p>
            <a 
              href="mailto:[SUPPORT_EMAIL]" 
              className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] hover:border-white/20 transition-all text-primary font-medium"
            >
              <Mail className="w-5 h-5" />
              [SUPPORT_EMAIL]
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
      <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-primary group-hover:bg-primary/10 group-hover:border-primary/20 transition-all">
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
