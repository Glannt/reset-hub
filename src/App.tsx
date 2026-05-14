import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { 
  LayoutDashboard, 
  Settings, 
  RefreshCw, 
  PlusCircle, 
  Shield, 
  Cpu, 
  Info, 
  Terminal,
  Activity,
  Search,
  Lock,
  FolderOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@radix-ui/react-scroll-area";

// --- TIÊU CHUẨN INTERFACE HỮU HÌNH CHO TYPESCRIPT ---
interface MultiLangString {
  vi: string;
  en: string;
  [key: string]: string;
}

interface ActionItem {
  id: string;
  label: MultiLangString;
  file: string;
  require_admin: boolean;
}

interface RegistryCheck {
  hive: string;
  path: string;
  key: string;
}

interface Manifest {
  id: string;
  name: MultiLangString;
  description: MultiLangString;
  icon: string;
  version_check?: RegistryCheck;
  actions: ActionItem[];
}

interface InstalledTool {
  folder_name: string;
  detected_version: string;
  manifest: Manifest;
}

// --- HỆ THỐNG TỪ ĐIỂN ĐA NGÔN NGỮ ---
const i18n = {
  vi: {
    brand: "RESET HUB",
    nav_menu: "Hệ thống",
    nav_dashboard: "Bảng Điều Khiển",
    nav_refresh: "Quét Lại Hệ Thống",
    nav_settings: "Cấu Hình",
    status_active: "Sẵn sàng",
    header_title: "Kho Công Cụ Bảo Trì",
    header_desc: "Quản lý, kiểm tra phiên bản và tự động hóa dọn dẹp hệ điều hành nâng cao.",
    btn_add: "Thêm Tool Mới",
    msg_scanning: "Đang tải plugin hệ thống...",
    msg_empty_title: "Chưa Cài Đặt Plugin",
    msg_empty_desc: "Nhấn nút Thêm Tool Mới hoặc thả các thư mục tool cấu hình chuẩn vào thư mục `/tools`.",
    card_version: "Bản cài: ",
    toast_success_title: "Thành Công",
    toast_success_desc: "Đã khởi chạy công cụ bảo trì!",
    toast_err_title: "Lỗi Thực Thi",
    toast_refresh: "Cập nhật danh sách thành công!",
    modal_desc: "Thông tin chi tiết plugin",
    modal_specs: "Registry Tương Tác",
    modal_actions: "Tệp Thực Thi Kích Hoạt",
    modal_raw: "🔐 Dữ Liệu Cấu Hình Thô (Manifest.json)",
  },
  en: {
    brand: "RESET HUB",
    nav_menu: "System Menu",
    nav_dashboard: "Dashboard",
    nav_refresh: "Rescan Tools",
    nav_settings: "Settings",
    status_active: "Active",
    header_title: "Maintenance Hub",
    header_desc: "Manage, audit version metrics, and securely execute system repair plugins.",
    btn_add: "Import New Tool",
    msg_scanning: "Scouting native plugins...",
    msg_empty_title: "No Plugin Found",
    msg_empty_desc: "Click 'Import' or register structured plugin directory under application `/tools` path.",
    card_version: "Detected: ",
    toast_success_title: "Action Dispatched",
    toast_success_desc: "System utility process spawned successfully!",
    toast_err_title: "Runtime Error",
    toast_refresh: "Plugin catalog refreshed!",
    modal_desc: "Plugin technical specifications",
    modal_specs: "Target Registry Settings",
    modal_actions: "Associated Executables",
    modal_raw: "🔐 Structural Dynamic Definition (Manifest.json)",
  }
};

export default function App() {
  const [lang, setLang] = useState<"vi" | "en">("vi");
  const [tools, setTools] = useState<InstalledTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal State
  const [selectedTool, setSelectedTool] = useState<InstalledTool | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const t = i18n[lang];

  // 1. Tải danh sách các Tool từ Rust backend
  const loadTools = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await invoke<InstalledTool[]>("get_installed_tools");
      setTools(data);
    } catch (err) {
      console.error("Load failure:", err);
      toast({
        variant: "destructive",
        title: "Error loading catalog",
        description: String(err),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTools();
  }, []);

  // 2. Sự kiện Nút Kích Hoạt Tác Vụ (Reset, Cleanup, etc.)
  const triggerAction = async (folderName: string, fileName: string, requireAdmin: boolean) => {
    try {
      toast({
        title: t.toast_success_title,
        description: t.toast_success_desc,
      });
      const msg = await invoke<string>("run_tool_action", { 
        folderName, 
        fileName, 
        requireAdmin 
      });
      console.log("Process run response:", msg);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t.toast_err_title,
        description: String(error),
      });
    }
  };

  // 3. Lệnh Nhập/Import thư mục tool mới
  const handleImportTool = async () => {
    try {
      const successMsg = await invoke<string>("import_tool");
      toast({
        title: "Import successful",
        description: successMsg,
      });
      // Quét lại ngay lập tức
      setTimeout(() => loadTools(true), 600);
    } catch (err) {
      if (err !== "Cancelled") {
        toast({
          variant: "destructive",
          title: "Import aborted",
          description: String(err),
        });
      }
    }
  };

  // 4. Mở Modal xem chi tiết thông số Tool
  const openDetail = (tool: InstalledTool) => {
    setSelectedTool(tool);
    setIsDialogOpen(true);
  };

  // 5. Lọc tìm kiếm công cụ trên Dashboard
  const filteredTools = tools.filter(tool => {
    const name = (tool.manifest.name[lang] || tool.manifest.name["en"]).toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="flex w-screen h-screen text-slate-200">
      {/* --- SIDEBAR THIẾT KẾ KÍNH MỜ --- */}
      <aside className="w-64 border-r border-white/5 bg-card/20 backdrop-blur-2xl flex flex-col p-5 select-none z-10">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="bg-gradient-to-tr from-indigo-500 to-purple-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
            <Activity className="w-4.5 h-4.5 text-white stroke-[2.5px]" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-wider bg-gradient-to-r from-white via-indigo-100 to-slate-400 bg-clip-text text-transparent">
              {t.brand}
            </h1>
            <p className="text-[10px] text-slate-500 tracking-tight uppercase">Version 0.2.0</p>
          </div>
        </div>

        <nav className="flex-1 space-y-6">
          <div>
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-slate-500 px-3 mb-2">
              {t.nav_menu}
            </h3>
            <ul className="space-y-1">
              <li>
                <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-white text-xs font-medium shadow-sm shadow-indigo-500/5">
                  <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                  {t.nav_dashboard}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => {
                    loadTools(false);
                    toast({ title: t.toast_refresh });
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all text-xs font-medium"
                >
                  <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                  {t.nav_refresh}
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-slate-500 px-3 mb-2">
              Localization
            </h3>
            <div className="grid grid-cols-2 gap-1.5 px-2">
              <Button
                variant={lang === "vi" ? "default" : "outline"}
                size="sm"
                onClick={() => setLang("vi")}
                className="text-xs h-8 bg-white/5 border-white/5 hover:bg-white/10"
                style={lang === "vi" ? {background: "hsl(var(--primary))"} : {}}
              >
                Tiếng Việt
              </Button>
              <Button
                variant={lang === "en" ? "default" : "outline"}
                size="sm"
                onClick={() => setLang("en")}
                className="text-xs h-8 bg-white/5 border-white/5 hover:bg-white/10"
                style={lang === "en" ? {background: "hsl(var(--primary))"} : {}}
              >
                English
              </Button>
            </div>
          </div>
        </nav>

        <div className="mt-auto pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-slate-500">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          <span>{t.status_active}</span>
        </div>
      </aside>

      {/* --- MAIN CONTENT REGION --- */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-8 relative z-0">
          {/* Top Bar Layout */}
          <header className="flex items-start justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                {t.header_title}
              </h2>
              <p className="text-sm text-slate-400 max-w-md mt-1 font-medium leading-relaxed">
                {t.header_desc}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative hidden sm:block">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
                <input 
                  type="text"
                  placeholder="Filter..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-card/40 hover:bg-card/70 focus:bg-card/90 border border-white/5 text-xs px-9 py-2.5 rounded-xl outline-none w-44 focus:w-56 transition-all duration-300 text-white"
                />
              </div>
              <Button 
                onClick={handleImportTool}
                className="bg-gradient-to-tr from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white shadow-xl shadow-indigo-600/15 flex items-center gap-1.5 font-semibold tracking-wide h-10 px-4 rounded-xl border-none text-xs"
              >
                <PlusCircle className="w-4 h-4" />
                {t.btn_add}
              </Button>
            </div>
          </header>

          {/* Rendering Dashboard content conditionally */}
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3 animate-pulse">
              <Activity className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-sm font-medium">{t.msg_scanning}</p>
            </div>
          ) : filteredTools.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center p-12 text-center bg-card/20 backdrop-blur-sm">
              <FolderOpen className="w-12 h-12 text-slate-600 mb-4 stroke-[1.5px]" />
              <h3 className="text-lg font-bold text-slate-300 mb-1">{t.msg_empty_title}</h3>
              <p className="text-sm text-slate-500 max-w-sm">{t.msg_empty_desc}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTools.map((item) => {
                const { manifest, detected_version, folder_name } = item;
                const toolName = manifest.name[lang] || manifest.name["en"];
                const toolDesc = manifest.description[lang] || manifest.description["en"];
                
                const isNotInstalled = detected_version.toLowerCase().includes("not");

                return (
                  <Card 
                    key={folder_name} 
                    className="group glass-card overflow-hidden relative select-none border border-white/5 hover:shadow-2xl hover:shadow-indigo-500/5 flex flex-col rounded-2xl"
                  >
                    {/* Absoluted Detail Icon Button */}
                    <button 
                      onClick={() => openDetail(item)}
                      className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900/20 opacity-50 group-hover:opacity-100 hover:bg-white/10 hover:text-white border border-transparent hover:border-white/10 text-slate-400 transition-all duration-250"
                    >
                      <Info className="w-4 h-4" />
                    </button>

                    <CardHeader className="pb-3 pt-5 px-5 flex flex-row items-start gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:bg-indigo-500/5 group-hover:border-indigo-500/10 transition-colors duration-300">
                        <img 
                          src={manifest.icon} 
                          alt={toolName} 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://cdn-icons-png.flaticon.com/512/888/888853.png";
                          }}
                          className="w-7 h-7 object-contain opacity-85"
                        />
                      </div>
                      <div className="min-w-0 flex-1 pr-4">
                        <CardTitle className="text-sm font-bold text-white truncate group-hover:text-indigo-200 transition-colors">
                          {toolName}
                        </CardTitle>
                        <Badge 
                          variant={isNotInstalled ? "destructive" : "secondary"} 
                          className={`mt-1.5 px-2 py-0 text-[10px] font-semibold font-mono flex items-center gap-1 w-max rounded-md ${!isNotInstalled ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/10 hover:bg-indigo-500/15' : ''}`}
                        >
                          <Cpu className="w-3 h-3" />
                          {t.card_version}{detected_version}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="px-5 pb-4 flex-1 flex flex-col">
                      <p className="text-slate-400 text-xs leading-relaxed font-medium line-clamp-2 mb-4">
                        {toolDesc}
                      </p>
                    </CardContent>

                    <CardFooter className="p-5 pt-0 mt-auto flex flex-col gap-2">
                      {manifest.actions.map((action) => {
                        const actionLabel = action.label[lang] || action.label["en"];
                        return (
                          <Button 
                            key={action.file}
                            variant="secondary" 
                            onClick={() => triggerAction(folder_name, action.file, action.require_admin)}
                            className="w-full justify-center gap-2 bg-white/5 hover:bg-indigo-600 hover:text-white border border-white/5 font-semibold text-xs h-9 rounded-xl transition-all duration-250 group-hover:border-indigo-500/20 shadow-sm"
                          >
                            {action.require_admin && <Shield className="w-3.5 h-3.5 stroke-[2.5px]" />}
                            {actionLabel}
                          </Button>
                        );
                      })}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* --- DỰ PHÒNG DIALOG POPUP CHI TIẾT CÔNG CỤ --- */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {selectedTool && (
          <DialogContent className="bg-[#0b101d]/95 border border-white/10 text-slate-200 shadow-2xl shadow-black max-w-lg sm:rounded-2xl backdrop-blur-2xl">
            <DialogHeader className="flex flex-row items-center gap-3.5 border-b border-white/5 pb-4">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center flex-shrink-0 overflow-hidden">
                <img 
                  src={selectedTool.manifest.icon} 
                  alt="Tool Icon" 
                  onError={(e) => {(e.target as HTMLImageElement).src = "https://cdn-icons-png.flaticon.com/512/888/888853.png"}}
                  className="w-7 h-7 object-contain" 
                />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                  {selectedTool.manifest.name[lang] || selectedTool.manifest.name["en"]}
                </DialogTitle>
                <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-300 text-[10px] font-mono h-5 mt-0.5 px-2 font-bold border-none">
                  v{selectedTool.detected_version}
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-5 py-2 select-text max-h-[60vh] overflow-y-auto pr-1.5">
              {/* Spec Detail Description */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  {t.modal_desc}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed bg-white/3 border border-white/3 rounded-xl p-3.5 font-medium">
                  {selectedTool.manifest.description[lang] || selectedTool.manifest.description["en"]}
                </p>
              </div>

              {/* Technical System Specs */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  {t.modal_specs}
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-slate-950/40 border border-white/5 rounded-xl p-3">
                    <span className="block text-[9px] text-slate-500 uppercase font-bold mb-1">Registry Hive</span>
                    <code className="font-mono font-bold text-indigo-300">{selectedTool.manifest.version_check?.hive || "N/A"}</code>
                  </div>
                  <div className="bg-slate-950/40 border border-white/5 rounded-xl p-3">
                    <span className="block text-[9px] text-slate-500 uppercase font-bold mb-1">Metric Key</span>
                    <code className="font-mono font-bold text-indigo-300">{selectedTool.manifest.version_check?.key || "N/A"}</code>
                  </div>
                  <div className="bg-slate-950/40 border border-white/5 rounded-xl p-3 col-span-2">
                    <span className="block text-[9px] text-slate-500 uppercase font-bold mb-1">Subkey Path</span>
                    <code className="font-mono block text-indigo-300 font-medium break-all select-text leading-normal">
                      {selectedTool.manifest.version_check?.path || "N/A"}
                    </code>
                  </div>
                </div>
              </div>

              {/* Action Executables */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  {t.modal_actions}
                </h4>
                <div className="space-y-2">
                  {selectedTool.manifest.actions.map((action) => (
                    <div key={action.file} className="flex items-center justify-between bg-slate-950/30 hover:bg-slate-950/60 border border-white/5 rounded-xl p-3 transition-all">
                      <div>
                        <p className="text-xs font-bold text-white">{action.label[lang] || action.label["en"]}</p>
                        <code className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                          <FolderOpen className="w-3 h-3 inline" />
                          ./tools/{selectedTool.folder_name}/{action.file}
                        </code>
                      </div>
                      {action.require_admin && (
                        <Badge className="bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold text-[9px] px-2 flex items-center gap-1 rounded-md select-none hover:bg-amber-500/15">
                          <Lock className="w-2.5 h-2.5" />
                          UAC Admin
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Advanced Expandable Section */}
              <div className="pt-1">
                <details className="group border border-white/5 rounded-xl overflow-hidden">
                  <summary className="bg-slate-950/40 group-open:bg-slate-950/70 p-3 text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer flex items-center justify-between select-none">
                    {t.modal_raw}
                  </summary>
                  <pre className="bg-[#04060b] p-4 border-t border-white/5 font-mono text-[10px] overflow-x-auto leading-normal max-h-40 select-text">
                    <code className="text-indigo-200/80">
                      {JSON.stringify(selectedTool.manifest, null, 2)}
                    </code>
                  </pre>
                </details>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
