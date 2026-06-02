"use client";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldAlert, Mail, ClipboardCopy, CheckCircle } from "lucide-react";
import { useNavigate } from "@/lib/router-polyfill";
import { useSeo } from "@/hooks/useSeo";

const Dmca = () => {
  const navigate = useNavigate();
  useSeo({ 
    title: "DMCA Compliance - Moviebay", 
    description: "Learn about Moviebay's DMCA copyright compliance policy and how to file infringement notifications." 
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
              navigate("/");
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider mb-6">
            <ShieldAlert className="w-3 h-3" />
            Copyright Policy
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">
            DMCA Compliance
          </h1>
          <p className="text-white/40 text-lg">
            Moviebay takes intellectual property rights seriously and complies fully with the Digital Millennium Copyright Act.
          </p>
        </motion.div>

        {/* Content */}
        <div className="space-y-12">
          <Section 
            icon={<ShieldAlert className="w-5 h-5" />}
            title="1. Copyright Policy Overview"
            content="Moviebay acts strictly as a web indexing service that compiles publicly available streaming links from external hosting servers (such as BunnyCDN, TMDB, and third-party media storage providers). We do not host, store, upload, or transmit any media content directly on our servers. As such, any copyright infringement requests should ultimately be directed to the third-party providers hosting the files."
          />

          <Section 
            icon={<ClipboardCopy className="w-5 h-5" />}
            title="2. Filing a Takedown Notice"
            content={
              <div className="space-y-4">
                <p>If you believe that your copyrighted work is indexed on Moviebay in a manner that constitutes infringement, you may submit a formal written notice to our copyright agent containing the following details:</p>
                <ul className="list-disc pl-5 space-y-2 text-white/60">
                  <li>A physical or electronic signature of the authorized representative of the copyright owner.</li>
                  <li>Identification of the copyrighted work claimed to have been infringed.</li>
                  <li>Specific identification and target URLs of the movie pages on Moviebay indexing the content.</li>
                  <li>Your direct contact information, including name, email address, and telephone number.</li>
                  <li>A statement that you have a good faith belief that the use of the material is unauthorized.</li>
                  <li>A statement, under penalty of perjury, that the information in the notification is accurate and that you are the copyright owner or authorized agent.</li>
                </ul>
              </div>
            }
          />

          <Section 
            icon={<CheckCircle className="w-5 h-5" />}
            title="3. Policy Actions"
            content="Upon receipt of a valid and complete DMCA compliance notification, we will review the claim and act promptly to remove or disable access to the index links pointing to the alleged infringing material on our platform. In accordance with the DMCA, we reserve the right to remove access without prior warning to the indexing submitters."
          />

          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-4">4. Legal Copyright Contact</h3>
              <p className="text-white/60 mb-6 flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                Please direct all copyright complaints and legal inquiries to:
              </p>
              <div className="text-red-400 font-bold p-4 rounded-xl bg-red-500/5 border border-red-500/10 inline-block">
                legal@s-u.in
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5 max-w-xs shrink-0">
              <img 
                src="/tmdb-logo-long.svg" 
                alt="TMDB Logo" 
                className="h-3.5 w-auto shrink-0 opacity-40" 
              />
              <p className="text-[9px] text-white/40 leading-normal">
                This service uses TMDB and the TMDB APIs to fetch movie/series titles and images but is not endorsed, certified, or approved by TMDB.
              </p>
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
      <div className="w-10 h-10 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center text-red-400 group-hover:bg-red-500/10 group-hover:border-red-500/20 transition-all">
        {icon}
      </div>
      <h2 className="text-xl font-bold text-white">{title}</h2>
    </div>
    <div className="pl-14 text-white/50 leading-relaxed text-base">
      {content}
    </div>
  </motion.section>
);

export default Dmca;
