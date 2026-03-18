import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getAllPendingPayments, getAllPayments, approvePayment, rejectPayment,
  getAllSchools, getPlatformActivities, getPlatformSettings,
  getPlatformStats, updatePlatformSetting, manualExtendSubscription,
  suspendSchool, restoreSchool, updateSchoolPlan, subscribeToPlatformChanges,
  deleteSchool, repairSchoolProfile, getDiscoveryMetrics, deactivateSchool,
  getTeachersBySchool, deleteTeacher, SEAT_LIMITS
} from '../data/store';
import Loader from '../components/Common/Loader';
import SuperAdminLoader from '../components/Common/SuperAdminLoader';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Inter:wght@300;400;500;600&display=swap');

.sa-root *,.sa-root *::before,.sa-root *::after{box-sizing:border-box;margin:0;padding:0}
.sa-root{
  --bg:#0C0E0D;--bg2:#111411;--panel:#161A17;--panel2:#1C2119;
  --edge:rgba(255,255,255,0.06);--edge2:rgba(255,255,255,0.1);
  --txt:#D4DDD6;--sub:#5A6B5C;--dim:#354037;
  --vi:#7C5CFC;--te:#0DD88A;--am:#E8A020;--ro:#D4506A;--sk:#4A9EE8;
  --fh:'Space Mono',monospace;--fb:'Inter',sans-serif;
  --sb:220px;
  position:fixed;inset:0;z-index:1000;
  font-family:var(--fb);font-size:13px;
  background:var(--bg);color:var(--txt);
  display:flex;overflow:hidden;
}
.sa-root ::-webkit-scrollbar{width:3px;height:3px}
.sa-root ::-webkit-scrollbar-track{background:transparent}
.sa-root ::-webkit-scrollbar-thumb{background:var(--dim);border-radius:2px}

/* ══ SIDEBAR ══ */
.sa-sidebar{width:var(--sb);min-width:var(--sb);height:100%;background:var(--bg2);border-right:1px solid var(--edge);display:flex;flex-direction:column;overflow-y:auto;transition:transform .25s ease;z-index:200;flex-shrink:0}
.sb-brand{padding:18px 18px 14px;border-bottom:1px solid var(--edge);display:flex;align-items:center;gap:10px;flex-shrink:0}
.sb-logo{width:34px;height:34px;border-radius:8px;background:linear-gradient(135deg,var(--vi),#5B3ED4);display:flex;align-items:center;justify-content:center;font-family:var(--fh);font-weight:700;font-size:.8rem;color:#fff;box-shadow:0 0 14px rgba(124,92,252,.3);flex-shrink:0}
.sb-name{font-family:var(--fh);font-size:.68rem;font-weight:700;color:var(--txt);line-height:1.3}
.sb-tag{font-size:.52rem;color:var(--sub);letter-spacing:.07em;text-transform:uppercase;margin-top:1px}
.sb-period{padding:10px 14px;border-bottom:1px solid var(--edge);flex-shrink:0}
.sb-lbl{font-size:.52rem;color:var(--sub);letter-spacing:.08em;text-transform:uppercase;margin-bottom:5px}
.sb-period select{width:100%;background:var(--panel);border:1px solid var(--edge2);border-radius:6px;padding:6px 28px 6px 9px;font-family:var(--fb);font-size:.7rem;color:var(--txt);outline:none;cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%235A6B5C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 8px center}
.sb-sec{padding:12px 14px 5px;font-size:.52rem;color:var(--sub);letter-spacing:.1em;text-transform:uppercase;flex-shrink:0}
.sb-nav{display:flex;align-items:center;gap:8px;padding:7px 14px;margin:1px 6px;border-radius:6px;font-size:.76rem;color:var(--sub);cursor:pointer;transition:all .15s;flex-shrink:0;position:relative}
.sb-nav:hover{background:var(--panel);color:var(--txt)}
.sb-nav.on{background:var(--panel2);color:var(--txt)}
.sb-nav.on::before{content:'';position:absolute;left:0;top:20%;bottom:20%;width:2.5px;border-radius:0 2px 2px 0;background:var(--vi)}
.nav-ico{width:19px;height:19px;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:9px;flex-shrink:0}
.sb-spacer{flex:1}
.sb-status{background:var(--panel);border:1px solid var(--edge);border-radius:7px;padding:9px 11px;margin:8px 8px 4px;flex-shrink:0}
.ss-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}
.ss-lbl{font-size:.5rem;color:var(--sub);letter-spacing:.08em;text-transform:uppercase}
.ss-dot{display:flex;align-items:center;gap:3px;font-size:.6rem;color:var(--te);font-weight:600}
.sa-dot{width:5px;height:5px;border-radius:50%;background:var(--te);box-shadow:0 0 5px var(--te);display:inline-block;flex-shrink:0}
.ss-name{font-family:var(--fh);font-size:.68rem;font-weight:700;color:var(--txt)}
.sb-signout{display:flex;align-items:center;gap:8px;padding:7px 11px;margin:4px 8px 10px;border-radius:6px;font-size:.75rem;color:var(--ro);cursor:pointer;background:rgba(212,80,106,.07);border:1px solid rgba(212,80,106,.14);transition:all .2s;flex-shrink:0}
.sb-signout:hover{background:rgba(212,80,106,.14)}

/* ══ OVERLAY ══ */
.sa-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:1150}
.sa-overlay.show{display:block}

/* ══ MAIN ══ */
.sa-main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;background:#0C0E0D}
.sa-topbar{height:52px;flex-shrink:0;background:#111411;border-bottom:1px solid var(--edge);display:flex;align-items:center;gap:12px;padding:0 20px}
.sa-menu-btn{display:none;width:40px;height:40px;border-radius:10px;background:var(--panel2);border:1px solid var(--vi);align-items:center;justify-content:center;cursor:pointer;font-size:18px;flex-shrink:0;color:var(--vi);box-shadow:0 0 12px rgba(124,92,252,.2);margin-right:4px}
.sa-close-btn{display:none;position:absolute;top:20px;right:18px;width:34px;height:34px;border-radius:8px;background:var(--panel2);border:1px solid var(--edge2);align-items:center;justify-content:center;cursor:pointer;font-size:14px;color:var(--sub);z-index:1600;box-shadow:0 4px 10px rgba(0,0,0,0.3)}
.sa-search-wrap{flex:1;max-width:360px;background:var(--panel);border:1px solid var(--edge);border-radius:7px;padding:6px 11px;display:flex;align-items:center;gap:7px;transition:border-color .18s}
.sa-search-wrap:focus-within{border-color:var(--edge2)}
.sa-search-wrap svg{width:12px;height:12px;flex-shrink:0;color:var(--sub)}
.sa-search-wrap input{flex:1;background:transparent;border:none;outline:none;font-family:var(--fb);font-size:.76rem;color:var(--txt)}
.sa-search-wrap input::placeholder{color:var(--sub)}
.sa-search-clear{font-size:10px;color:var(--sub);cursor:pointer;padding:2px 4px;border-radius:3px}
.sa-search-clear:hover{color:var(--txt)}
.sa-tb-right{margin-left:auto;display:flex;align-items:center}
.sa-tb-badge{padding:5px 12px;border-radius:6px;background:var(--panel);border:1px solid var(--edge);font-size:.72rem;color:var(--sub);display:flex;align-items:center;gap:6px}
.sa-tb-badge-dot{width:20px;height:20px;border-radius:5px;background:linear-gradient(135deg,var(--vi),#5B3ED4);display:flex;align-items:center;justify-content:center;font-family:var(--fh);font-size:.55rem;font-weight:700;color:#fff}
.sa-content{flex:1;overflow-y:auto;padding:20px;min-width:0;background:#0C0E0D !important}
.sa-content .sa{background:#0C0E0D !important;min-height:100%}
.sa-content .sa .tv{background:#0C0E0D !important}
.sa-content .sa .page-hd{background:#0C0E0D !important}

/* ni colors */
.sa .ni-v{background:rgba(124,92,252,.18);color:var(--vi)}
.sa .ni-t{background:rgba(13,216,138,.14);color:var(--te)}
.sa .ni-a{background:rgba(232,160,32,.14);color:var(--am)}
.sa .ni-r{background:rgba(212,80,106,.14);color:var(--ro)}
.sa .ni-s{background:rgba(74,158,232,.14);color:var(--sk)}
.sa .ni-d{background:rgba(255,255,255,.05);color:var(--sub)}

/* toast */
.sa .toast{margin:0 0 16px;padding:11px 16px;border-radius:10px;font-size:.78rem;font-weight:600;display:flex;align-items:center;gap:8px}
.sa .toast-ok{background:rgba(13,216,138,.08);border:1px solid var(--te);color:var(--te)}
.sa .toast-err{background:rgba(212,80,106,.08);border:1px solid var(--ro);color:var(--ro)}

/* page header */
.sa .page-hd{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:12px}
.sa .ph-left{display:flex;align-items:center;gap:11px}
.sa .ph-ico{width:40px;height:40px;border-radius:9px;background:var(--panel);border:1px solid var(--edge);display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0}
.sa .ph-title{font-family:var(--fh);font-size:1.1rem;font-weight:700;color:#fff;line-height:1.1}
.sa .ph-sub{font-size:.7rem;color:var(--sub);margin-top:2px}
.sa .ph-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:100px;background:rgba(13,216,138,.1);border:1px solid rgba(13,216,138,.2);font-size:.58rem;font-weight:600;color:var(--te);margin-top:5px}
.sa .ph-right{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.sa .act-btn{padding:6px 12px;border-radius:7px;font-family:var(--fb);font-size:.7rem;font-weight:500;cursor:pointer;transition:all .18s;background:transparent;border:1px solid var(--edge2);color:var(--sub)}
.sa .act-btn:hover{color:var(--txt);border-color:var(--edge2)}
.sa .act-btn.active{background:var(--panel2);color:var(--txt);border-color:var(--edge2)}
.sa .act-sel{background:var(--panel);border:1px solid var(--edge);color:var(--txt);padding:6px 24px 6px 10px;appearance:none;font-family:var(--fb);font-size:.7rem;border-radius:7px;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%235A6B5C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 7px center;outline:none}

/* filter bar */
.sa .filter-bar{display:flex;align-items:center;gap:6px;margin-bottom:14px;padding:10px 13px;background:var(--panel2);border:1px solid var(--edge);border-radius:8px;flex-wrap:wrap}
.sa .filter-bar span{font-size:.6rem;color:var(--sub);text-transform:uppercase;letter-spacing:.08em;margin-right:4px}
.sa .fbtn{padding:4px 10px;border-radius:5px;font-family:var(--fb);font-size:.68rem;cursor:pointer;border:1px solid var(--edge);background:transparent;color:var(--sub);transition:all .15s}
.sa .fbtn:hover{color:var(--txt)}
.sa .fbtn.on{background:var(--vi);color:#fff;border-color:var(--vi)}

/* KPI grid */
.sa .kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;min-width:0}
.sa .kpi{background:var(--panel);border:1px solid var(--edge);border-radius:10px;padding:13px;position:relative;overflow:hidden;min-width:0}
.sa .kpi-accent{position:absolute;top:0;left:0;width:3px;height:100%;border-radius:10px 0 0 10px}
.sa .kpi-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px;padding-left:7px}
.sa .kpi-lbl{font-size:.55rem;color:var(--sub);letter-spacing:.07em;text-transform:uppercase;font-weight:500}
.sa .kpi-ico{width:26px;height:26px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px}
.sa .kpi-val{font-family:var(--fh);font-size:1.4rem;font-weight:700;color:#fff;line-height:1;padding-left:7px;margin-bottom:4px}
.sa .kpi-ft{display:flex;align-items:center;justify-content:space-between;padding-left:7px}
.sa .kpi-ch{font-size:.62rem;font-weight:600}
.sa .kup{color:var(--te)}.sa .kdn{color:var(--ro)}
.sa .kpi-note{font-size:.58rem;color:var(--sub)}

/* chart panels */
.sa .charts-grid{display:grid;grid-template-columns:2fr 1fr;gap:10px;margin-bottom:14px;min-width:0}
.sa .charts-grid-3{display:grid;grid-template-columns:1fr 2fr;gap:10px;margin-bottom:14px;min-width:0}
.sa .cp{background:var(--panel);border:1px solid var(--edge);border-radius:10px;padding:13px;min-width:0}
.sa .cp-hd{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px}
.sa .cp-lbl{font-size:.52rem;color:var(--sub);letter-spacing:.07em;text-transform:uppercase;margin-bottom:3px}
.sa .cp-val{font-family:var(--fh);font-size:.95rem;font-weight:700;color:#fff;display:flex;align-items:center;gap:7px}
.sa .cp-per{font-size:.62rem;color:var(--sub);cursor:pointer;white-space:nowrap;padding-top:2px}
.sa .cbadge{font-size:.55rem;font-weight:700;padding:2px 5px;border-radius:3px}
.sa .cup{background:rgba(13,216,138,.14);color:var(--te)}
.sa .cdn{background:rgba(212,80,106,.14);color:var(--ro)}
.sa .chart-box{position:relative}
  /* deactivatedSchoolsLog is computed dynamically in the render using isSchoolActive */
/* bot grid */
.sa .bot-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;min-width:0}
.sa .lp{background:var(--panel);border:1px solid var(--edge);border-radius:10px;padding:13px;min-width:0}
.sa .lp-t{font-family:var(--fh);font-size:.76rem;font-weight:700;color:var(--txt);margin-bottom:12px}

/* list items */
.sa .li{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--edge)}
.sa .li:last-child{border:none}
.sa .li-l{display:flex;align-items:center;gap:9px}
.sa .li-ico{width:26px;height:26px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0}
.sa .li-name{font-size:.73rem;font-weight:500;color:var(--txt)}
.sa .li-sub{font-size:.58rem;color:var(--sub);margin-top:1px}
.sa .pill{padding:2px 7px;border-radius:100px;font-size:.55rem;font-weight:600;background:rgba(90,107,92,.18);color:var(--sub)}
.sa .pill-g{background:rgba(13,216,138,.12);color:var(--te)}
.sa .pill-r{background:rgba(212,80,106,.12);color:var(--ro)}
.sa .pill-y{background:rgba(232,160,32,.12);color:var(--am)}
.sa .li-date{font-size:.57rem;color:var(--sub);text-align:right;margin-top:3px}

/* activity */
.sa .ai{display:flex;align-items:flex-start;gap:9px;padding:8px 0;border-bottom:1px solid var(--edge)}
.sa .ai:last-child{border:none}
.sa .ai-body{flex:1;min-width:0}
.sa .ai-t{font-size:.73rem;font-weight:500;color:var(--txt);line-height:1.35}
.sa .ai-s{font-size:.6rem;color:var(--sub);margin-top:1px}
.sa .ai-time{font-size:.58rem;color:var(--dim);white-space:nowrap;padding-top:1px}

/* integrity */
.sa .ig{display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--edge)}
.sa .ig:last-child{border:none}
.sa .ig-l{display:flex;align-items:center;gap:9px}
.sa .ig-nm{font-size:.73rem;font-weight:500;color:var(--txt)}
.sa .ig-st{font-size:.62rem;font-weight:600}
.sa .is-ok{color:var(--te)}.sa .is-w{color:var(--am)}.sa .is-e{color:var(--ro)}

/* tables */
.sa .tbl-w{overflow-x:auto;-webkit-overflow-scrolling:touch}
.sa table{width:100%;border-collapse:collapse;font-size:.73rem}
.sa th{text-align:left;padding:9px 11px;font-size:.55rem;letter-spacing:.07em;text-transform:uppercase;color:var(--sub);font-weight:500;border-bottom:1px solid var(--edge)}
.sa td{padding:10px 11px;border-bottom:1px solid var(--edge);color:var(--txt)}
.sa tr:last-child td{border:none}
.sa tr:hover td{background:rgba(255,255,255,.015)}
.sa .td-b{font-weight:500}
.sa .td-m{font-family:var(--fh);font-size:.68rem}

/* payment list */
.sa .pay{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--edge)}
.sa .pay:last-child{border:none}
.sa .pay-l{display:flex;align-items:center;gap:9px}
.sa .pay-nm{font-size:.73rem;font-weight:500;color:var(--txt)}
.sa .pay-dt{font-size:.58rem;color:var(--sub);margin-top:1px}
.sa .pay-v{font-family:var(--fh);font-size:.78rem;font-weight:700}
.sa .pay-tp{font-size:.58rem;color:var(--sub);text-align:right;margin-top:1px}
.sa .pos{color:var(--te)}

/* settings */
.sa textarea,.sa input[type=text],.sa input[type=date]{width:100%;background:var(--bg);border:1px solid var(--edge);border-radius:7px;padding:9px 11px;color:var(--txt);font-family:var(--fb);font-size:.76rem;outline:none;transition:border-color .18s;resize:vertical}
.sa textarea:focus,.sa input[type=text]:focus,.sa input[type=date]:focus{border-color:var(--edge2)}
.sa input[type=date]{color-scheme:dark;appearance:none}
.sa .save-btn{background:var(--vi);color:#fff;border:none;padding:9px 18px;border-radius:7px;font-family:var(--fb);font-size:.78rem;font-weight:600;cursor:pointer;box-shadow:0 4px 14px rgba(124,92,252,.3);transition:all .2s}
.sa .save-btn:hover{background:#6B4DEB;transform:translateY(-1px)}
.sa .btn{background:transparent;border:1px solid var(--edge2);border-radius:5px;padding:6px 14px;font-family:var(--fb);font-size:.75rem;font-weight:600;color:var(--txt);cursor:pointer;transition:all .18s;display:flex;align-items:center;justify-content:center;gap:4px;width:100%;max-width:120px}
.sa .btn:hover{background:var(--panel2)}
.sa .btn:disabled{opacity:.4;cursor:not-allowed}

/* spinner */
.sa .spin{width:28px;height:28px;border:2px solid var(--edge2);border-top-color:var(--vi);border-radius:50%;animation:saspin .7s linear infinite}
@keyframes saspin{to{transform:rotate(360deg)}}
.sa .tv{animation:fi .22s ease}
@keyframes fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

/* modal */
.sa .mo{display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.7);align-items:center;justify-content:center;padding:20px}
.sa .mo.open{display:flex}
.sa .mb{background:var(--panel);border:1px solid var(--edge2);border-radius:14px;padding:28px;width:100%;max-width:440px;position:relative}
.sa .mc{position:absolute;top:14px;right:14px;background:var(--bg);border:1px solid var(--edge);border-radius:6px;width:28px;height:28px;color:var(--sub);cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center}
.sa .mi{background:var(--bg);border:1px solid var(--edge);border-radius:9px;padding:13px 15px;margin-bottom:18px}
.sa .mir{display:flex;justify-content:space-between;padding-bottom:8px;margin-bottom:8px;border-bottom:1px solid var(--edge)}
.sa .mir:last-child{border:none;padding:0;margin:0}
.sa .mil{font-size:.6rem;color:var(--sub);letter-spacing:.07em;text-transform:uppercase}
.sa .miv{font-family:var(--fh);font-size:.75rem;font-weight:700;color:#fff}
.sa .pms{display:flex;gap:8px;margin-top:7px}
.sa .pm{flex:1;padding:9px 12px;border-radius:8px;cursor:pointer;text-align:center;transition:all .18s}
.sa .pm.on{border:1.5px solid rgba(13,216,138,.35);background:rgba(13,216,138,.08)}
.sa .pm:not(.on){border:1.5px solid var(--edge);background:transparent}
.sa .pmt{font-size:.7rem;font-weight:600}
.sa .pms2{font-size:.58rem;color:var(--sub);margin-top:2px}
.sa .po{padding:11px 14px;border-radius:9px;margin-bottom:8px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;transition:all .18s}
.sa .po.sel{border:1.5px solid var(--sk);background:rgba(74,158,232,.07)}
.sa .po:not(.sel){border:1.5px solid var(--edge);background:var(--bg)}
.sa .po.cur{opacity:.4;pointer-events:none !important;border:1.5px solid var(--edge) !important;background:var(--bg) !important}

/* empty state */
.sa .empty{padding:40px 0;text-align:center;color:var(--sub);font-size:.82rem}
.sa .empty-ico{font-size:1.8rem;margin-bottom:10px}

/* ΓòÉΓòÉ RESPONSIVE ΓòÉΓòÉ */
@media(max-width:1024px){
  .sa-root{--sb:190px}
  .sa .kpi-grid{grid-template-columns:repeat(3,1fr)}
  .sa .charts-grid,.sa .charts-grid-3,.sa .bot-grid{grid-template-columns:1fr}
  .sa .ph-right{display:none}
}
@media(max-width:900px){
  .sa-root{--sb:180px}
  .sa .kpi-grid{grid-template-columns:repeat(2,1fr)}
  .sa .charts-grid,.sa .charts-grid-3,.sa .bot-grid{grid-template-columns:1fr}
  .sa .ph-right{display:none}
  .sa th,.sa td{padding:8px 9px}
}
@media(max-width:768px){
  .sa-sidebar{position:fixed;top:0;left:0;bottom:0;transform:translateX(-100%);z-index:1500;width:260px;min-width:260px;height:100vh}
  .sa-sidebar.open{transform:translateX(0)}
  .sa-menu-btn{display:flex !important}
  .sa-close-btn{display:flex !important}
  .sa .kpi-grid{grid-template-columns:repeat(2,1fr);gap:12px}
  .sa .charts-grid,.sa .charts-grid-3,.sa .bot-grid{grid-template-columns:1fr;gap:12px}
  .sa .ph-right{display:none}
  .sa .tbl-w{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 -10px;padding:0 10px}
  .sa table{min-width:700px}
  
  /* Sticky First Column for mobile readability */
  .sa-table th:first-child,
  .sa-table td:first-child {
    position: sticky;
    left: 0;
    z-index: 10;
    background: #0C0E0D;
    border-right: 1px solid var(--edge);
  }
  .sa-table th:first-child { z-index: 11; }
  
  /* Hide low-priority columns on small mobile */
  .hide-mobile { display: none !important; }
  
  /* Stack action buttons vertically on mobile for better touch targets */
  .sa .act-btn-group { display: flex; flex-direction: column; gap: 4px; }
}
@media(max-width:480px){
  .sa-content{padding:12px}
  .sa-topbar{height:48px;padding:0 12px;gap:8px}
  .sa .kpi-grid{grid-template-columns:1fr;gap:10px}
  .sa .kpi-val{font-size:1.4rem}
  .sa .charts-grid,.sa .charts-grid-3,.sa .bot-grid{grid-template-columns:1fr;gap:10px}
  .sa .cp,.sa .lp{padding:11px}
  .sa .ph-ico{width:34px;height:34px;font-size:14px}
  .sa .ph-title{font-size:.95rem}
  .sa .save-btn{width:100%;padding:10px}
  .sa .bot-grid>*{width:100%}
  .sa-tb-badge{display:none}
  .sa table{min-width:650px}
}
@media(max-width:360px){
  .sa-search-wrap{display:none}
}
`;

const GC = 'rgba(255,255,255,0.05)', TC = '#354037';
const TIP = { backgroundColor:'#1C2119', borderColor:'rgba(255,255,255,.08)', borderWidth:1, titleColor:'#D4DDD6', bodyColor:'#5A6B5C' };

function useChart(ref, factory, deps) {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window.Chart === 'undefined') return;
    const chart = factory(el.getContext('2d'));
    return () => chart.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/* ΓöÇΓöÇ plan amount helper ΓöÇΓöÇ */
const planAmt = (plan, settings) => {
  const p = plan?.toLowerCase();
  if (settings?.pricing) {
    const key = Object.keys(settings.pricing).find(k => k.toLowerCase() === p);
    if (key) return settings.pricing[key].price;
  }
  return { champe: 50000, fala: 5999, starter: 5999 }[p] || 5999;
};

export default function SuperAdmin({ currentUser, sidebarOpen, setSidebarOpen, onSignOut }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const [pendingPayments, setPendingPayments] = useState([]);
  const [allPayments, setAllPayments]         = useState([]);
  const [schools, setSchools]                 = useState([]);
  const [activity, setActivity]               = useState([]);
  const [settings, setSettings]               = useState({});
  const [pStats, setPStats]                   = useState(null);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState(null);
  const [message, setMessage]                 = useState(null);

  /* ΓöÇΓöÇ new functional state ΓöÇΓöÇ */
  const [searchQuery, setSearchQuery]   = useState('');
  const [periodFilter, setPeriodFilter] = useState('monthly');  // monthly|weekly|yearly
  const [filterStatus, setFilterStatus] = useState('all');      // all|active|expired|deactivated
  const [showFilter, setShowFilter]     = useState(false);
  const [revPeriod, setRevPeriod]       = useState('year');     // day|month|year
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all'); // all|Pending|Approved|Rejected
  const [historySchoolFilter, setHistorySchoolFilter] = useState('all');

  /* ΓöÇΓöÇ modals ΓöÇΓöÇ */
  const [activateModal, setActivateModal]     = useState(null);
  const [payMethod, setPayMethod]             = useState('mpesa');
  const [payRef, setPayRef]                   = useState('');
  const [activating, setActivating]           = useState(false);
  const [activateSuccess, setActivateSuccess] = useState(false);
  const [planModal, setPlanModal]             = useState(null);
  const [chosenPlan, setChosenPlan]           = useState('');
  const [planSaving, setPlanSaving]           = useState(false);
  const [deleteModal, setDeleteModal]         = useState(null);
  const [deleting, setDeleting]               = useState(false);
  const [discoveryMeta, setDiscoveryMeta]     = useState({ orphans: [], legacy: [] });
  const [repairingId, setRepairingId]         = useState(null);
  const [staffModal, setStaffModal]           = useState(null); // {id, name, staff: []}
  const [loadingStaff, setLoadingStaff]       = useState(false);

  /* ΓöÇΓöÇ settings form ΓöÇΓöÇ */
  const [gwInstructions, setGwInstructions] = useState('');
  const [statusMsg, setStatusMsg]           = useState('');
  const [subEndDate, setSubEndDate]         = useState('');
  const [plans, setPlans]                   = useState([]); // Dynamic plans array: [{id, name, price, limit, active, features}]
  const [priceSaved, setPriceSaved]         = useState(false);

  /* ΓöÇΓöÇ chart refs ΓöÇΓöÇ */
  const revChartRef  = useRef(null);
  const growChartRef = useRef(null);
  const subChartRef  = useRef(null);
  const weekChartRef = useRef(null);
  const payChartRef  = useRef(null);
  const subBreakRef  = useRef(null);
  const revBigRef    = useRef(null);

  const PLATFORM_ADMINS = ['admin@shulesoft.com', 'shulesoft8@gmail.com'];
  const isSuperOwner = currentUser?.email && PLATFORM_ADMINS.includes(currentUser.email);

  useEffect(() => {
    const id = 'sa-styles';
    let tag = document.getElementById(id);
    if (!tag) { tag = document.createElement('style'); tag.id = id; document.head.appendChild(tag); }
    tag.textContent = CSS; // always refresh so hot-reload picks up changes
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

   /* ΓöÇΓöÇ REAL DATA COMPUTATIONS ΓöÇΓöÇ */
  const now              = new Date();
  const thirtyDaysAgo   = new Date(now.getTime() - 30*24*60*60*1000);
  const sevenDaysAgo    = new Date(now.getTime() -  7*24*60*60*1000);
  const sixtyDaysAgo    = new Date(now.getTime() - 60*24*60*60*1000);

  /* ΓöÇΓöÇ helper: is a school "Active"? More granular matching Billing page logic ΓöÇΓöÇ */
  const isSchoolActive = (s) => {
    const p = s.school_profiles?.[0];
    if (!p) return false;

    // 1. Explicit Deactivation / Suspension overrides everything
    if (['Deactivated', 'Suspended', 'Terminated'].includes(p.subscription_status)) return false;

    // 2. TRIAL Check
    if (p.subscription_status === 'Trial') {
      if (!p.subscription_expiry) return true;
      return new Date(p.subscription_expiry) > now;
    }

    // 3. GLOBAL TERM EXPIRY CHECK (Only if not explicitly 'Trial')
    if (subEndDate && p.subscription_status !== 'Trial') {
      const termExpiry = new Date(subEndDate);
      if (termExpiry < now) return false; // Term expired for everyone on regular plans
    }

    // 4. ACTIVE Status (Explicitly set after payment)
    if (p.subscription_status === 'Active') return true;

    // 5. Individual EXPIRY fallback
    if (p.subscription_expiry && new Date(p.subscription_expiry) > now) return true;
    
    return false;
  };

  const activeSchools   = schools.filter(isSchoolActive);
  const expiredSchools  = schools.filter(s => {
    const p = s.school_profiles?.[0];
    return p?.subscription_expiry && new Date(p.subscription_expiry) < now && !isSchoolActive(s);
  });
  const newThisMonth    = schools.filter(s => {
    const d = s.created_at || s.school_profiles?.[0]?.created_at;
    return d && new Date(d) > thirtyDaysAgo;
  });
  const newLastMonth    = schools.filter(s => {
    const d = s.created_at || s.school_profiles?.[0]?.created_at;
    return d && new Date(d) > sixtyDaysAgo && new Date(d) <= thirtyDaysAgo;
  });
  const newActiveThisMonth = activeSchools.filter(s => {
    const p = s.school_profiles?.[0];
    const d = p?.subscription_start || p?.created_at || s.created_at;
    return d && new Date(d) > thirtyDaysAgo;
  });

  const approvedPayments = allPayments.filter(p => p.status === 'Approved');
  
  const computedRevenue = approvedPayments
    .filter(p => new Date(p.created_at) > thirtyDaysAgo)
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const lastMonthRevenue = approvedPayments
    .filter(p => {
      const d = new Date(p.created_at);
      return d > sixtyDaysAgo && d <= thirtyDaysAgo;
    })
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalSchools    = pStats?.totalSchools     ?? schools.length;
  const activeCount     = pStats?.activeSubscribers ?? activeSchools.length;
  const expiredCount    = pStats?.expiredSubscribers ?? expiredSchools.length;
  const totalRevenue    = approvedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const newSchoolsCount = pStats?.newSchools        ?? newThisMonth.length;

  /* revenue % change ΓÇö real */
  const revChange = totalRevenue > 0 && lastMonthRevenue > 0
    ? Math.round(((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
    : null;
  const revChangeTxt = revChange !== null
    ? (revChange >= 0 ? `Γåæ +${revChange}%` : `Γåô ${revChange}%`)
    : activeCount > 0 ? `${activeCount} paying` : 'No data yet';
  const revChangeUp  = revChange === null ? true : revChange >= 0;

  const newSchoolsTxt = newThisMonth.length > 0
    ? `Γåæ +${newThisMonth.length} this month`
    : newLastMonth.length > 0 ? `${newLastMonth.length} last month` : 'No new schools';
  const activeChangeTxt = newActiveThisMonth.length > 0
    ? `Γåæ +${newActiveThisMonth.length} this month`
    : 'No new this month';

  /* ΓöÇΓöÇ Revenue chart data by period ΓöÇΓöÇ */
  const getRevData = (period) => {
    if (period === 'year') {
      const labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const data = labels.map((_,mi) =>
        approvedPayments.filter(p => {
          const d = new Date(p.created_at);
          return d.getFullYear() === now.getFullYear() && d.getMonth() === mi;
        }).reduce((sum,p) => sum + (p.amount || 0), 0)
      );
      return { labels, data };
    }
    if (period === 'month') {
      const labels = ['Week 1','Week 2','Week 3','Week 4'];
      const data = labels.map((_,wi) => {
        const wEnd   = new Date(now.getTime() - (3-wi)*7*24*60*60*1000);
        const wStart = new Date(now.getTime() - (4-wi)*7*24*60*60*1000);
        return approvedPayments.filter(p => {
          const d = new Date(p.created_at);
          return d >= wStart && d < wEnd;
        }).reduce((sum,p) => sum + (p.amount || 0), 0);
      });
      return { labels, data };
    }
    /* day = last 30 days */
    const labels = [], data = [];
    for (let i = 29; i >= 0; i--) {
      const dStart = new Date(now); dStart.setDate(now.getDate()-i); dStart.setHours(0,0,0,0);
      const dEnd   = new Date(dStart.getTime() + 86400000);
      labels.push(dStart.toLocaleDateString('en-KE',{day:'numeric',month:'short'}));
      data.push(approvedPayments.filter(p => {
        const d = new Date(p.created_at);
        return d >= dStart && d < dEnd;
      }).reduce((sum,p) => sum + (p.amount || 0), 0));
    }
    return { labels, data };
  };

  /* ΓöÇΓöÇ period-filtered data for overview lists ΓöÇΓöÇ */
  const periodMs = { weekly: 7*24*60*60*1000, monthly: 30*24*60*60*1000, yearly: 365*24*60*60*1000 };
  const periodCutoff = new Date(now.getTime() - (periodMs[periodFilter] || periodMs.monthly));
  const recentSchools = schools.filter(s => {
    const d = s.created_at || s.school_profiles?.[0]?.created_at;
    return !d || new Date(d) > periodCutoff;
  });

  /* ΓöÇΓöÇ Charts ΓöÇΓöÇ */
  useChart(revChartRef, (ctx) => {
    const g = ctx.createLinearGradient(0,0,0,100);
    g.addColorStop(0,'rgba(124,92,252,0.35)'); g.addColorStop(1,'rgba(124,92,252,0)');
    const { labels, data } = getRevData('year');
    return new window.Chart(ctx, { type:'line', data:{ labels, datasets:[{ data, borderColor:'#7C5CFC', backgroundColor:g, borderWidth:1.5, fill:true, tension:0.4, pointRadius:0, pointHoverRadius:3 }] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:{...TIP,callbacks:{label:c=>' KSh '+c.raw.toLocaleString()}} }, scales:{ x:{grid:{color:GC},ticks:{color:TC}}, y:{grid:{color:GC},ticks:{color:TC,callback:v=>v>0?'KSh '+v/1000+'K':0}} } } });
  }, [activeTab, schools]);

  useChart(growChartRef, (ctx) => {
    const g = ctx.createLinearGradient(0,0,0,100);
    g.addColorStop(0,'rgba(13,216,138,0.3)'); g.addColorStop(1,'rgba(13,216,138,0)');
    const labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].slice(0, now.getMonth()+1);
    let cum = 0;
    const data = labels.map((_,mi) => {
      cum += schools.filter(s => { const d = new Date(s.created_at || s.school_profiles?.[0]?.created_at || 0); return d.getFullYear() === now.getFullYear() && d.getMonth() === mi; }).length;
      return cum;
    });
    return new window.Chart(ctx, { type:'line', data:{ labels, datasets:[{ data, borderColor:'#0DD88A', backgroundColor:g, borderWidth:1.5, fill:true, tension:0.4, pointRadius:0, pointHoverRadius:3 }] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:TIP }, scales:{ x:{grid:{color:GC},ticks:{color:TC}}, y:{grid:{color:GC},ticks:{color:TC}} } } });
  }, [activeTab, schools]);

  useChart(subChartRef, (ctx) => {
    const plans = ['Fala', 'Champe'];
    const planLabels = ['Fala', 'Champe'];
    const active = planLabels.map(p => schools.filter(s => {
      const pData = s.school_profiles?.[0] || {};
      return (pData.subscription_status?.toLowerCase() === 'active') && 
             ((s.plan || pData.subscription_plan || 'Fala').toLowerCase() === p.toLowerCase());
    }).length);
    const deact  = planLabels.map(p => schools.filter(s => {
      const pData = s.school_profiles?.[0] || {};
      const sStatus = pData.subscription_status?.toLowerCase();
      return (sStatus !== 'active') && 
             !expiredSchools.some(ex => ex.id === s.id) && 
             ((s.plan || pData.subscription_plan || 'Fala').toLowerCase() === p.toLowerCase());
    }).length);
    const expd   = planLabels.map(p => expiredSchools.filter(s => {
      const pData = s.school_profiles?.[0] || {};
      return ((s.plan || pData.subscription_plan || 'Fala').toLowerCase() === p.toLowerCase());
    }).length);
    return new window.Chart(ctx, { type:'bar', data:{ labels:planLabels, datasets:[ {label:'Active',data:active,backgroundColor:'#7C5CFC'}, {label:'Deactivated',data:deact,backgroundColor:'#5A6B5C'}, {label:'Expired',data:expd,backgroundColor:'#D4506A'} ] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:TIP }, scales:{ x:{stacked:true,grid:{display:false},ticks:{color:TC}}, y:{stacked:true,grid:{color:GC},ticks:{color:TC}} } } });
  }, [activeTab, schools]);

  useChart(weekChartRef, (ctx) => {
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const data = days.map((_,di) => {
      const dStart = new Date(sevenDaysAgo.getTime() + di*86400000);
      const dEnd   = new Date(dStart.getTime() + 86400000);
      return approvedPayments.filter(p => {
        const d = new Date(p.created_at);
        return d >= dStart && d < dEnd;
      }).reduce((sum,p) => sum + (p.amount || 0), 0);
    });
    const pending = pendingPayments.filter(p => new Date(p.created_at) > sevenDaysAgo);
    const pendData = days.map((_,di) => {
      const dStart = new Date(sevenDaysAgo.getTime() + di*86400000);
      const dEnd   = new Date(dStart.getTime() + 86400000);
      return pending.filter(p => { const d = new Date(p.created_at); return d >= dStart && d < dEnd; }).reduce((s,p) => s + (p.amount||0), 0);
    });
    return new window.Chart(ctx, { type:'bar', data:{ labels:days, datasets:[ {label:'Collected',data,backgroundColor:'#7C5CFC'}, {label:'Pending',data:pendData,backgroundColor:'#E8A020'} ] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:{...TIP,callbacks:{label:c=>' KSh '+c.raw.toLocaleString()}} }, scales:{ x:{stacked:true,grid:{display:false},ticks:{color:TC}}, y:{stacked:true,grid:{color:GC},ticks:{color:TC,callback:v=>v>0?'KSh '+v/1000+'K':0}} } } });
  }, [activeTab, schools, pendingPayments, allPayments]);

  useChart(payChartRef, (ctx) => {
    const g = ctx.createLinearGradient(0,0,0,200);
    g.addColorStop(0,'rgba(212,80,106,0.35)'); g.addColorStop(1,'rgba(212,80,106,0)');
    const labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].slice(0,now.getMonth()+1);
    const data = labels.map((_,mi) =>
      approvedPayments.filter(p => {
        const d = new Date(p.created_at);
        return d.getFullYear()===now.getFullYear() && d.getMonth()===mi;
      }).reduce((sum,p)=>sum+(p.amount||0),0)
    );
    return new window.Chart(ctx, { type:'line', data:{ labels, datasets:[{ data, borderColor:'#D4506A', backgroundColor:g, borderWidth:1.5, fill:true, tension:0.4, pointRadius:0 }] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:{...TIP,callbacks:{label:c=>' KSh '+c.raw.toLocaleString()}} }, scales:{ x:{grid:{color:GC},ticks:{color:TC}}, y:{grid:{color:GC},ticks:{color:TC,callback:v=>v>0?'KSh '+v/1000+'K':0}} } } });
  }, [activeTab, schools, allPayments]);

  useChart(subBreakRef, (ctx) => {
    const susp = schools.filter(s=>s.school_profiles?.[0]?.subscription_status==='Suspended').length;
    const deact = schools.filter(s=>!['Active','Suspended'].includes(s.school_profiles?.[0]?.subscription_status)).length;
    return new window.Chart(ctx, { type:'doughnut', data:{ labels:['Active','Suspended','Deactivated','Expired'], datasets:[{ data:[activeCount,susp,deact,expiredCount], backgroundColor:['#7C5CFC','#4A9EE8','#5A6B5C','#D4506A'], borderWidth:0, hoverOffset:6 }] }, options:{ responsive:true, maintainAspectRatio:false, cutout:'68%', plugins:{ legend:{ display:true, position:'right', labels:{ color:'#5A6B5C', padding:14, font:{size:11} } }, tooltip:TIP } } });
  }, [activeTab, schools]);

  /* Revenue big chart ΓÇö reacts to revPeriod */
  useChart(revBigRef, (ctx) => {
    const g = ctx.createLinearGradient(0,0,0,220);
    g.addColorStop(0,'rgba(124,92,252,0.4)'); g.addColorStop(1,'rgba(124,92,252,0)');
    const { labels, data } = getRevData(revPeriod);
    return new window.Chart(ctx, { type:'line', data:{ labels, datasets:[ { label:'Revenue', data, borderColor:'#7C5CFC', backgroundColor:g, borderWidth:2, fill:true, tension:0.4, pointRadius:0, pointHoverRadius:4 } ] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:{...TIP,callbacks:{label:c=>' KSh '+c.raw.toLocaleString()}} }, scales:{ x:{grid:{color:GC},ticks:{color:TC}}, y:{grid:{color:GC},ticks:{color:TC,callback:v=>v>0?'KSh '+v/1000+'K':0}} } } });
  }, [activeTab, revPeriod, schools]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let cf = {};
      try {
        cf = await getPlatformSettings();
        setSettings(cf || {});
        setGwInstructions(cf?.billing?.instructions || '');
        setStatusMsg(cf?.platform?.status_message || '');
        setSubEndDate(cf?.billing?.expiry_date || '');
        
        const pricing = cf?.pricing || {};
        console.log('SuperAdmin Loaded Pricing Object:', pricing);
        const planArr = Object.entries(pricing).map(([id, p]) => ({
          id,
          name: id,
          price: p.price || 0,
          limit: p.limit || 0,
          active: p.active !== false,
          features: p.features || []
        }));
        console.log('SuperAdmin mapped Plan Array:', planArr);
        setPlans(planArr);
      } catch (e) {
        console.error('Failed to load platform settings:', e);
        setError("Could not load pricing settings. Please check your connection.");
      }

      // 2. Fetch specific dashboard data points independently
      const fetchData = async (fn, setter, defaultValue) => {
        try {
          const res = await fn();
          setter(res || defaultValue);
        } catch (e) {
          console.warn(`Dashboard partial failure (${fn.name}):`, e);
          if (defaultValue !== undefined) setter(defaultValue);
        }
      };

      await Promise.all([
        fetchData(getAllPendingPayments, setPendingPayments, []),
        fetchData(getAllPayments, setAllPayments, []),
        (async () => {
          // Step 1: Fetch schools ΓÇö no joins
          const rawSchools = await getAllSchools();
          console.log('SuperAdmin: raw schools fetched =', rawSchools.length);

          // Step 2: Fetch per-school user counts
          let userCounts = {};
          try {
            const { data: allUsers } = await supabase.from('users').select('school_id');
            if (allUsers) {
              allUsers.forEach(u => {
                if (u.school_id) userCounts[u.school_id] = (userCounts[u.school_id] || 0) + 1;
              });
            }
          } catch (e) { console.warn('Could not fetch user counts', e); }

          // Step 3: Attach user counts
          const enriched = rawSchools.map(s => ({
            ...s,
            _staffCount: userCounts[s.id] || 0
          }));
          setSchools(enriched);

          // Step 4: Optional extra profiles fetch (if joins missed anything)
          try {
            const { data: profiles } = await supabase.from('school_profiles').select('*');
            if (profiles && profiles.length > 0) {
              setSchools(enriched.map(s => {
                const existingProfiles = s.school_profiles || [];
                const extraProfiles = profiles.filter(p => p.school_id === s.id);
                // Merge and deduplicate
                const allProfiles = [...existingProfiles, ...extraProfiles].reduce((acc, curr) => {
                  if (!acc.find(p => p.id === curr.id)) acc.push(curr);
                  return acc;
                }, []);
                return { ...s, school_profiles: allProfiles };
              }));
            }
          } catch (pErr) {
            console.warn('SuperAdmin: Could not fetch profiles', pErr);
          }
        })(),
        fetchData(getPlatformActivities, setActivity, []),
        fetchData(getPlatformStats, setPStats, null),
        fetchData(getDiscoveryMetrics, setDiscoveryMeta, { orphans: [], legacy: [] })
      ]);
    } catch (err) {
      console.error('Overall loadData error:', err);
      setError("An unexpected error occurred while loading dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSuperOwner) return;
    loadData();
    console.log('SuperAdmin: Initializing Real-time listeners');

    const unsubscribe = subscribeToPlatformChanges(() => {
      console.log('Real-time platform update received, re-loading data');
      loadData();
    });

    return () => {
      unsubscribe();
    };
  }, [isSuperOwner]);

  const setTab = (tab) => { setSearchParams({ tab }); setSidebarOpen(false); setSearchQuery(''); };

  const statusLabel = (s) => (s === 'Active' ? 'Active' : s === 'Trial' ? 'Trial' : s === 'Suspended' ? 'Suspended' : s === 'Expired' ? 'Expired' : s === 'Inactive' ? 'Inactive' : s === 'Pending' ? 'Pending' : 'Deactivated');
  const sPill       = (s) => {
    if (s === 'Active') return 'pill pill-g';
    if (s === 'Trial') return 'pill pill-v';
    if (s === 'Suspended') return 'pill pill-y';
    if (s === 'Expired') return 'pill pill-r';
    if (s === 'Inactive' || s === 'Pending') return 'pill pill-s';
    return 'pill pill-r';
  };
  const fmtDate     = (d) => d ? new Date(d).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'}) : 'ΓÇö';
  const fmtMoney    = (n) => `KSh ${Number(n||0).toLocaleString()}`;
  const calcExpiry  = (ds) => {
    if (!ds) return null;
    const end=new Date(ds), today=new Date(); today.setHours(0,0,0,0);
    const diff=Math.ceil((end-today)/86400000);
    return { label:end.toLocaleDateString('en-KE',{weekday:'long',year:'numeric',month:'long',day:'numeric'}), note:diff>0?`${diff} days remaining`:diff===0?'Expires today':'Already passed', color:diff<=0?'var(--ro)':diff<30?'var(--am)':'var(--sub)' };
  };

  /* ΓöÇΓöÇ Actions ΓöÇΓöÇ */
  const handleApprove = async (p) => {
    if (!window.confirm(`Approve payment ${p.transaction_code}?`)) return;
    try { await approvePayment(p.id, p.school_id); setMessage({type:'success',text:'Payment approved.'}); loadData(); }
    catch (err) { setMessage({type:'error',text:err.message}); }
  };
  const handleReject = async (p) => {
    const reason = window.prompt('Reject reason:','Invalid transaction code');
    if (reason===null) return;
    try { await rejectPayment(p.id, p.school_id, reason); setMessage({type:'success',text:'Payment rejected.'}); loadData(); }
    catch (err) { setMessage({type:'error',text:err.message}); }
  };
  const handleRestore = async (id, name) => {
    if (!window.confirm(`Restore access for ${name}?`)) return;
    try { await restoreSchool(id); setMessage({type:'success',text:`${name} restored.`}); loadData(); }
    catch (err) { setMessage({type:'error',text:err.message}); }
  };
  const handleDeactivate = async (id, name) => {
    if (!window.confirm(`Deactivate ${name}? This will restrict their access.`)) return;
    try { 
      await deactivateSchool(id); 
      setMessage({type:'success',text:`${name} deactivated.`}); 
      loadData(); 
    } catch (err) { 
      console.error('Deactivation error:', err);
      setMessage({type:'error',text:err.message || 'Failed to deactivate school'}); 
    }
  };

  const handleBulkDeactivate = async () => {
    if (!filteredSchools.length) return;
    if (!window.confirm(`WARNING: Deactivate ALL ${filteredSchools.length} schools currently in view?`)) return;
    try {
      setMessage({type:'info', text: 'Processing bulk deactivation...'});
      for (const s of filteredSchools) {
        await deactivateSchool(s.id);
      }
      setMessage({type:'success', text: `Successfully deactivated ${filteredSchools.length} schools.`});
      loadData();
    } catch (err) {
      setMessage({type:'error', text: err.message});
    }
  };

  const handleBulkActivate = async () => {
    if (!filteredSchools.length) return;
    if (!window.confirm(`WARNING: Activate ALL ${filteredSchools.length} schools currently in view (+4 months)?`)) return;
    try {
      setMessage({type:'info', text: 'Processing bulk activation...'});
      for (const s of filteredSchools) {
        await restoreSchool(s.id);
      }
      setMessage({type:'success', text: `Successfully activated ${filteredSchools.length} schools.`});
      loadData();
    } catch (err) {
      setMessage({type:'error', text: err.message});
    }
  };

  const handleRowDeleteSchool = async (id, name) => {
    if (!window.confirm(`STRICT WARNING: Terminate ${name}? This will DELETE all their data permanently.`)) return;
    if (!window.confirm(`Are you absolutely sure? This cannot be undone.`)) return;
    try {
      await deleteSchool(id);
      setMessage({type:'success',text:`${name} terminated and deleted.`});
      loadData();
    } catch (err) {
      console.error('Termination error:', err);
      setMessage({type:'error',text:err.message || 'Failed to terminate school'});
    }
  };
  const handleSuspend = async (id, name) => {
    if (!window.confirm(`Suspend ${name}?`)) return;
    try { 
      await suspendSchool(id); 
      setMessage({type:'success',text:`${name} suspended.`}); 
      loadData(); 
    } catch (err) { 
      console.error('Suspension error:', err);
      setMessage({type:'error',text:err.message || 'Failed to suspend school'}); 
    }
  };
  const handleUpdateSetting = async (key, value) => {
    try { await updatePlatformSetting(key,{...(settings[key]||{}),...value}); setMessage({type:'success',text:'Settings saved.'}); loadData(); }
    catch (err) { setMessage({type:'error',text:err.message}); }
  };
  const handleConfirmActivate = async () => {
    if (!activateModal) return; 
    setActivating(true);
    try { 
      await restoreSchool(activateModal.id); 
      setActivateSuccess(true); 
      setMessage({type:'success', text: `Successfully activated ${activateModal.name}`});
      loadData(); 
      setTimeout(() => {
        setActivateModal(null);
        setActivateSuccess(false);
        setPayRef('');
      }, 2800); 
    } catch (err) { 
      console.error('Activation error:', err);
      setMessage({type:'error', text: err.message || 'Failed to activate school'}); 
      setActivateModal(null); 
    } finally { 
      setActivating(false); 
    }
  };
  const handleChangePlan = async () => {
    if (!chosenPlan||!planModal) return; setPlanSaving(true);
    try { 
      await updateSchoolPlan(planModal.schoolId, chosenPlan); 
      setMessage({type:'success',text:`${planModal.schoolName} switched to ${chosenPlan}.`}); 
      setPlanModal(null); 
      setChosenPlan(''); 
      loadData(); 
    }
    catch (err) { setMessage({type:'error',text:err.message}); }
    finally { setPlanSaving(false); }
  };
  const handleDeleteSchool = async () => {
    if (!deleteModal) return;
    try {
      setDeleting(true);
      await deleteSchool(deleteModal.id);
      setMessage({ type: 'success', text: `Successfully terminated ${deleteModal.name}` });
      setDeleteModal(null);
      loadData();
    } catch (err) {
      console.error('Delete school error:', err);
      setMessage({ type: 'error', text: 'Failed to terminate school' });
    } finally {
      setDeleting(false);
    }
  };
  const handleRepair = async (id, name) => {
    try {
      setRepairingId(id);
      await repairSchoolProfile(id);
      setMessage({ type: 'success', text: `Successfully repaired ${name}` });
      loadData();
    } catch (err) {
      console.error('Repair error:', err);
      setMessage({ type: 'error', text: 'Failed to repair school metadata' });
    } finally {
      setRepairingId(null);
    }
  };
  const handleOpenStaffModal = async (id, name) => {
    setStaffModal({ id, name, staff: [] });
    setLoadingStaff(true);
    try {
      const staff = await getTeachersBySchool(id);
      setStaffModal(prev => ({ ...prev, staff }));
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load staff list' });
    } finally {
      setLoadingStaff(false);
    }
  };
  const handleDeleteStaff = async (teacherId, teacherName) => {
    if (!window.confirm(`Permanently delete ${teacherName}?`)) return;
    try {
      await deleteTeacher(teacherId);
      setStaffModal(prev => ({
        ...prev,
        staff: prev.staff.filter(t => t.id !== teacherId)
      }));
      setMessage({ type: 'success', text: `Deleted teacher ${teacherName}` });
      loadData(); // Refresh school counts
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete staff' });
    }
  };
  const handleSignOut = () => { if (onSignOut) onSignOut(); else window.location.href='/'; };

  if (!isSuperOwner) {
    return (
      <div style={{padding:48,textAlign:'center',background:'#0C0E0D',color:'#D4DDD6',minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
        <div style={{fontSize:'2.5rem',marginBottom:12}}>≡ƒöÆ</div>
        <h2 style={{color:'#D4506A',fontFamily:"'Space Mono',monospace",marginBottom:8}}>Access Denied</h2>
        <p style={{color:'#5A6B5C',fontSize:'0.85rem'}}>This area is restricted to ShuleSoft platform administrators only.</p>
      </div>
    );
  }

  const expiryInfo = calcExpiry(subEndDate);
  const navItems = [
    {id:'overview',      ico:'📊',  cls:'ni-v', label:'Overview'},
    {id:'schools',       ico:'🏛️', cls:'ni-t', label:'Schools'},
    {id:'payments',      ico:'💳', cls:'ni-a', label:'Payments'},
    {id:'history',       ico:'📋', cls:'ni-s', label:'Payment History'},
    {id:'subscriptions', ico:'📅', cls:'ni-s', label:'Subscriptions'},
    {id:'revenue',       ico:'📈', cls:'ni-v', label:'Revenue'},
    {id:'activity',      ico:'⚡', cls:'ni-t', label:'Activity'},
    {id:'config',        ico:'⚙️',  cls:'ni-d', label:'Settings'},
    {id:'recovery',      ico:'🩺', cls:'ni-r', label:'Recovery'},
  ];

  /* ── Search-filtered data ── */
  const q = searchQuery.toLowerCase();
  const filteredSchools = schools.filter(s => {
    const p = s.school_profiles?.[0]||{};
    const sPlan = (s.plan || p.subscription_plan || 'Fala').toLowerCase();
    const sStatus = (p.subscription_status || 'Active').toLowerCase();
    
    const matchQ = !q || s.name?.toLowerCase().includes(q) || p.location?.toLowerCase().includes(q) || sPlan.includes(q);
    const matchS = filterStatus==='all' || 
                   (filterStatus==='active' && sStatus==='active') || 
                   (filterStatus==='expired' && expiredSchools.some(ex => ex.id === s.id)) || 
                   (filterStatus==='deactivated' && sStatus==='deactivated');
    return matchQ && matchS;
  });
  const filteredActivity = activity.filter(a => !q || a.description?.toLowerCase().includes(q) || a.school_name?.toLowerCase().includes(q));
  const filteredPayments = pendingPayments.filter(p => !q || p.school_profiles?.school_name?.toLowerCase().includes(q) || p.transaction_code?.toLowerCase().includes(q));

  /* -- Revenue panel label -- */
  const revPeriodLabel = {day:'Last 30 Days', month:'Last 4 Weeks', year:`Year ${now.getFullYear()}`}[revPeriod];
  const weeklyRevenue  = approvedPayments
    .filter(p => new Date(p.created_at) > sevenDaysAgo)
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="sa-root">
      {/* ══ SIDEBAR ══ */}
      <aside className={`sa-sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sb-brand">
          <div className="sb-logo"><div className="sb-logo-grid"><span/><span/><span/><span/></div></div>
          <div className="sb-brand-txt">
            <div className="sb-name">ShuleSoft</div>
            <div className="sb-tag" style={{lineHeight:1.1,fontSize:'.55rem'}}>PLATFORM<br/>ENGINE</div>
          </div>
          <button className="sa-close-btn" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>

        <div className="sb-sec">Main Controls</div>
        <div className="sb-nav-list">
          {navItems.map(item => (
            <div key={item.id} className={`sb-nav${activeTab === item.id ? ' on' : ''}`} onClick={() => setTab(item.id)}>
              <div className={`nav-ico ${item.cls}`}>{item.ico}</div>
              {item.label}
            </div>
          ))}
        </div>

        <div className="sb-spacer" />

        <div className="sb-status">
          <div className="ss-row">
            <span className="ss-lbl">System Status</span>
            <div className="ss-dot"><span className="sa-dot" /> Operational</div>
          </div>
          <div className="ss-name">ShuleSoft Core v2.0</div>
        </div>

        <div className="sb-signout" onClick={handleSignOut}>
          <span>👋</span> Sign Out
        </div>
      </aside>

      {/* ══ MOBILE OVERLAY ══ */}
      {sidebarOpen && <div className="sa-overlay show" onClick={() => setSidebarOpen(false)} />}

      <div className="sa" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* ══ MAIN ══ */}
        <div className="sa-main">
          <div className="sa-topbar">
            {/* MOBILE MENU TOGGLE */}
            <button className="sa-menu-btn" onClick={() => setSidebarOpen(o => !o)}>☰</button>
            <div className="sa-search-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
              <input
                type="text"
                placeholder="Search schools, payments, activity..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && <span className="sa-search-clear" onClick={() => setSearchQuery('')}>✕</span>}
            </div>
            <div className="sa-tb-right">
              <div className="sa-tb-badge">
                <div className="sa-tb-badge-dot">SA</div>Super Admin
              </div>
            </div>
          </div>

          <div className="sa-content">
            <div className="sa">

              {message && (
                <div className={`toast ${message.type === 'success' ? 'toast-ok' : 'toast-err'}`}>
                  <span>{message.type === 'success' ? '✓' : '✕'}</span> {message.text}
                </div>
              )}

              {loading ? <SuperAdminLoader /> : <div className="sa-inner">

                {/* ══ PERSISTENT HEADER ══ */}
                <div className="page-hd" style={{ background: 'transparent' }}>
                  <div className="ph-left">
                    <div className="ph-ico">🌐</div>
                    <div>
                      <div className="ph-title">System Observatory</div>
                      <div className="ph-sub">Real-time Platform Management</div>
                      <div className="ph-badge"><span className="sa-dot" /> High-Availability Cluster</div>
                    </div>
                  </div>
                  <div className="ph-right">
                    <select className="act-sel" value={periodFilter} onChange={e => setPeriodFilter(e.target.value)}>
                      <option value="weekly">This Week</option>
                      <option value="monthly">This Month</option>
                      <option value="yearly">This Year</option>
                    </select>
                    <button className={`act-btn${showFilter ? ' active' : ''}`} onClick={() => setShowFilter(f => !f)}>
                      {showFilter ? '✕ Close' : '⚙ Filter'}
                    </button>
                  </div>
                </div>

                {/* ══ OVERVIEW ══ */}
                {activeTab === 'overview' && <div className="tv">

                {showFilter && (
                  <div className="filter-bar">
                    <span>Status:</span>
                    {['all','active','expired','deactivated'].map(s=>(
                      <button key={s} className={`fbtn${filterStatus===s?' on':''}`} onClick={()=>setFilterStatus(s)}>
                        {s.charAt(0).toUpperCase()+s.slice(1)}
                      </button>
                    ))}
                  </div>
                )}

                <div className="kpi-grid">
                  {[
                    {a:'var(--vi)',c:'ni-v',l:'Total Schools',        i:'🏫',v:totalSchools,           ch:newSchoolsTxt,            n:'Across Kenya',     up:newThisMonth.length>0},
                    {a:'var(--te)',c:'ni-t',l:'Active Subscriptions', i:'⚡',v:activeCount,            ch:activeChangeTxt,          n:'Paid & running',   up:newActiveThisMonth.length>0},
                    {a:'var(--ro)',c:'ni-r',l:'Expired',              i:'⚠️', v:expiredCount,           ch:expiredCount>0?'Follow-up needed':'All good',n:'SMS sent',up:false},
                    {a:'var(--am)',c:'ni-a',l:'Revenue This Term',    i:'📈',v:fmtMoney(totalRevenue), ch:revChangeTxt,             n:'M-PESA',           up:revChangeUp},
                    {a:'var(--sk)',c:'ni-s',l:'New Schools',          i:'✨',v:newSchoolsCount,        ch:newSchoolsCount>0?`↑ ${newSchoolsCount} registered`:'No new schools',n:'This month',up:newSchoolsCount>0},
                    {a:'rgba(212,80,106,.5)',c:'ni-r',l:'Pending Payments',i:'⏳',v:pendingPayments.length,ch:pendingPayments.length>0?'Awaiting confirmation':'All clear',n:'M-PESA queue',up:false},
                  ].map((k,i)=>(
                    <div className="kpi" key={i}>
                      <div className="kpi-accent" style={{background:k.a}}/>
                      <div className="kpi-hd"><span className="kpi-lbl">{k.l}</span><div className={`kpi-ico ${k.c}`}>{k.i}</div></div>
                      <div className="kpi-val">{k.v}</div>
                      <div className="kpi-ft"><span className={`kpi-ch ${k.up?'kup':'kdn'}`}>{k.ch}</span><span className="kpi-note">{k.n}</span></div>
                    </div>
                  ))}
                </div>

                <div className="charts-grid">
                  <div className="cp">
                    <div className="cp-hd">
                      <div>
                        <div className="cp-lbl">Revenue This Year</div>
                        <div className="cp-val">{fmtMoney(totalRevenue)} {revChange!==null&&<span className={`cbadge ${revChangeUp?'cup':'cdn'}`}>{revChange>=0?'+':''}{revChange}%</span>}</div>
                      </div>
                      <div className="cp-per">THIS YEAR →</div>
                    </div>
                    <div className="chart-box"><canvas ref={revChartRef} height="100"/></div>
                  </div>
                  <div className="cp">
                    <div className="cp-hd">
                      <div>
                        <div className="cp-lbl">School Growth</div>
                        <div className="cp-val">{totalSchools} <span className="cbadge cup">+{newSchoolsCount} new</span></div>
                      </div>
                      <div className="cp-per">THIS YEAR →</div>
                    </div>
                    <div className="chart-box"><canvas ref={growChartRef} height="100"/></div>
                  </div>
                </div>

                <div className="charts-grid-3">
                  <div className="cp">
                    <div className="cp-hd"><div><div className="cp-lbl">Subscription Mix</div><div className="cp-val">{totalSchools} schools</div></div></div>
                    <div className="chart-box"><canvas ref={subChartRef} height="100"/></div>
                  </div>
                  <div className="cp">
                    <div className="cp-hd">
                      <div>
                        <div className="cp-lbl">Weekly Payments</div>
                        <div className="cp-val">{fmtMoney(weeklyRevenue)} {weeklyRevenue>0?<span className="cbadge cup">this week</span>:null}</div>
                      </div>
                      <div className="cp-per">THIS WEEK →</div>
                    </div>
                    <div className="chart-box"><canvas ref={weekChartRef} height="100"/></div>
                  </div>
                </div>

                <div className="bot-grid">
                  <div className="lp">
                    <div className="lp-t">Recent Schools</div>
                    {(q ? filteredSchools : recentSchools).length===0
                      ? <div className="empty"><div className="empty-ico">🏛️</div>No schools found.</div>
                      : (q ? filteredSchools : recentSchools).slice(0,5).map((s,i)=>{
                          const p=s.school_profiles?.[0]||{};
                          const cls=['ni-v','ni-t','ni-a','ni-s','ni-r'][i%5];
                          return (
                            <div className="li" key={s.id}>
                              <div className="li-l"><div className={`li-ico ${cls}`}>🏛️</div><div><div className="li-name">{s.name}</div><div className="li-sub">{p.subscription_plan||'Starter'} • {p.location||'Kenya'}</div></div></div>
                              <div><span className={sPill(p.subscription_status)}>{statusLabel(p.subscription_status)}</span><div className="li-date">{fmtDate(p.created_at||s.created_at)}</div></div>
                            </div>
                          );
                        })
                    }
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    <div className="lp" style={{flex:1}}>
                      <div className="lp-t">Recent Activity</div>
                      {filteredActivity.length===0
                        ? <div className="empty"><div className="empty-ico">⚡</div>No activity yet.</div>
                        : filteredActivity.slice(0,4).map(a=>(
                            <div className="ai" key={a.id}>
                              <div className="li-ico ni-t">⚡</div>
                              <div className="ai-body"><div className="ai-t">{a.description}</div><div className="ai-s">{a.school_name||'System'}</div></div>
                              <div className="ai-time">{fmtDate(a.created_at)}</div>
                            </div>
                          ))
                      }
                    </div>
                    <div className="lp">
                      <div className="lp-t">🧑‍🎓 Student Overview</div>
                      {[
                        {c:'ni-v',e:'🏛️',n:'Total Students',  s:'Across all active schools', v:pStats?.totalStudents?pStats.totalStudents.toLocaleString():'—',st:''},
                        {c:'ni-t',e:'📚',n:'CBC Portfolios',  s:'Generated this term',       v:pStats?.cbcPortfolios?pStats.cbcPortfolios.toLocaleString():'—',st:'is-ok'},
                        {c:'ni-a',e:'📝',n:'Exams Recorded',  s:'Results entered',           v:pStats?.examsRecorded?pStats.examsRecorded.toLocaleString():'—',st:'is-ok'},
                        {c:'ni-s',e:'⚡',n:'Attendance Rate', s:'Platform-wide average',     v:pStats?.attendanceRate?`${pStats.attendanceRate}%`:'—',st:'is-ok'},
                      ].map((r,i)=>(
                        <div className="ig" key={i}>
                          <div className="ig-l"><div className={`li-ico ${r.c}`}>{r.e}</div><div><div className="ig-nm">{r.n}</div><div style={{fontSize:'.58rem',color:'var(--sub)'}}>{r.s}</div></div></div>
                          <span className={`ig-st${r.st?' '+r.st:''}`} style={{fontFamily:'var(--fh)',fontSize:'.85rem',color:r.st?undefined:'#fff'}}>{r.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>}

              {/* ==== SCHOOLS ==== */}
              {activeTab==='schools' && <div className="tv">
                <div className="lp">
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:8}}>
                    <div className="lp-t" style={{margin:0}}>All Schools ({filteredSchools.length}/{totalSchools})</div>
                    <div style={{display:'flex',gap:8}}>
                      <button className="act-btn" onClick={handleBulkActivate} style={{color:'var(--te)',borderColor:'rgba(13,216,138,.2)'}}>Activate All</button>
                      <button className="act-btn" onClick={handleBulkDeactivate} style={{color:'var(--ro)',borderColor:'rgba(212,80,106,.2)'}}>Deactivate All</button>
                      <button className={`act-btn${showFilter?' active':''}`} onClick={()=>setShowFilter(f=>!f)}>
                        {showFilter?'✕ Close':'⚙ Filter'}
                      </button>
                    </div>
                  </div>
                  {showFilter && (
                    <div className="filter-bar" style={{marginBottom:12}}>
                      <span>Status:</span>
                      {['all','active','expired','deactivated'].map(s=>(
                        <button key={s} className={`fbtn${filterStatus===s?' on':''}`} onClick={()=>setFilterStatus(s)}>
                          {s.charAt(0).toUpperCase()+s.slice(1)}
                          {s!=='all' && <span style={{marginLeft:4,opacity:.7}}>
                            ({s==='active'?activeCount:s==='expired'?expiredCount:schools.filter(x=>!['Active','Suspended'].includes(x.school_profiles?.[0]?.subscription_status)).length})
                          </span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {filteredSchools.length===0
                    ? <div className="empty"><div className="empty-ico">🏛️</div>{q?'No schools match your search.':'No schools registered yet.'}</div>
                    : <div className="tbl-w">
                        <table className="data-table sa-table">
                          <thead>
                            <tr><th>School</th><th>Plan</th><th>Staff Usage</th><th className="hide-mobile">Location</th><th>Students</th><th>Joined</th><th>Status</th><th>Revenue</th><th>Sub</th><th>Action</th></tr>
                          </thead>
                          <tbody>
                            {filteredSchools.map(s=>{
                              const p=s.school_profiles?.[0]||{};
                              const curPlan = s.plan || p.subscription_plan || 'Fala';
                              const pData = p; // Alias for clarity
                              const isActive  = isSchoolActive(s);
                              
                              // Use more robust plan lookup matching Security.jsx
                              const pricing = settings?.pricing || {};
                              const activePlanKey = Object.keys(pricing).find(k => k.toLowerCase() === curPlan.toLowerCase());
                              const planInfo = activePlanKey ? pricing[activePlanKey] : { price: 5999, limit: 150 };
                              const amt = planInfo.price || 0;
                              const studentLimit = planInfo.limit || 150;
                              const adminLimit = planInfo.admins || 5;
                              return (
                                <tr key={s.id}>
                                  <td data-label="School" className="td-b">
                                    <div style={{fontWeight:600}}>{s.name}</div>
                                    {s.phone && <div style={{fontSize:'.65rem',color:'var(--sub)',fontWeight:400}}>{s.phone}</div>}
                                  </td>
                                  <td data-label="Plan" style={{textTransform:'capitalize'}}>
                                    <span style={{
                                      padding: '2px 8px',
                                      borderRadius: 12,
                                      background: settings?.pricing?.[curPlan] ? 'rgba(124,92,252,0.1)' : 'rgba(255,255,255,0.05)',
                                      color: settings?.pricing?.[curPlan] ? 'var(--vi)' : 'var(--sub)',
                                      fontSize: '.68rem',
                                      fontWeight: 600,
                                      display: 'inline-block'
                                    }}>{curPlan}</span>
                                  </td>
                                  <td data-label="Staff Usage">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'inherit' }}>
                                      <div className="td-m" style={{ color: (s._staffCount||0) > adminLimit ? 'var(--er)' : 'var(--txt)', fontWeight: (s._staffCount||0) > adminLimit ? 700 : 400 }}>
                                        {s._staffCount || 0} / {adminLimit}
                                      </div>
                                      {(s._staffCount||0) > adminLimit && <span title="Seat limit exceeded" style={{ cursor: 'help' }}>⚠️</span>}
                                    </div>
                                  </td>
                                  <td data-label="Location" className="hide-mobile">{s.location || pData.location || 'Kenya'}</td>
                                  <td data-label="Students" className="td-m">
                                    <div style={{fontWeight:600}}>{s._studentCount || 0}</div>
                                    <div style={{fontSize:'.6rem',color:'var(--sub)'}}>Limit: {studentLimit}</div>
                                  </td>
                                  <td data-label="Joined">{fmtDate(pData.created_at||s.created_at)}</td>
                                  <td data-label="Status">
                                    <span className={sPill(pData.subscription_status || (isActive ? 'Active' : 'Inactive'))}>
                                      {pData.subscription_status || (isActive ? 'Active' : 'Inactive')}
                                    </span>
                                  </td>
                                  <td data-label="Revenue" className="td-m" style={{color:isActive?'var(--te)':'var(--sub)'}}>{isActive?fmtMoney(amt):'—'}</td>
                                  <td data-label="Subscription">
                                    <button className="act-btn" style={{fontSize:'.63rem',padding:'3px 10px',color:'var(--sk)',borderColor:'rgba(74,158,232,.25)'}}
                                      onClick={()=>{setPlanModal({schoolId:s.id,schoolName:s.name,currentPlan:curPlan});setChosenPlan('');}}>Change Plan</button>
                                  </td>
                                  <td data-label="Action">
                                    <div className="act-btn-group" style={{justifyContent: 'inherit'}}>
                                      <button className="act-btn" style={{fontSize:'.63rem',padding:'3px 8px',color:'var(--te)',borderColor:'rgba(13,216,138,.25)',background:'rgba(13,216,138,.05)'}} 
                                        onClick={()=>{setActivateModal(s);setPayMethod('mpesa');setPayRef('');setActivateSuccess(false);}}>Activate</button>
                                      
                                      <button className="act-btn" style={{fontSize:'.63rem',padding:'3px 8px',color:'var(--ro)',borderColor:'rgba(212,80,106,.25)',background:'rgba(212,80,106,.06)'}} 
                                        onClick={()=>handleDeactivate(s.id,s.name)}>Deactivate</button>
                                      
                                      <button className="act-btn" style={{fontSize:'.63rem',padding:'3px 8px',color:'var(--sub)',borderColor:'var(--edge2)',background:'rgba(255,255,255,.05)'}} 
                                        onClick={()=>handleRowDeleteSchool(s.id, s.name)}>Terminate</button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                  }
                </div>
              </div>}

              {/* #### PAYMENTS #### */}
              {activeTab==='payments' && <div className="tv">
                <div className="bot-grid">
                  <div className="lp">
                    <div className="lp-t">
                      {filteredPayments.length>0 ? `Pending Approvals (${filteredPayments.length})` : 'Recent Payments'}
                    </div>
                    {filteredPayments.length>0
                      ? filteredPayments.map((p,i)=>{
                          const cls=['ni-t','ni-v','ni-a','ni-r','ni-s'][i%5];
                          return (
                            <div className="pay" key={p.id} style={{ flexWrap: 'wrap', gap: 12 }}>
                              <div className="pay-l" style={{flex: 1, minWidth: '200px'}}>
                                 <div className={`li-ico ${cls}`}>💳</div>
                                <div>
                                  <div className="pay-nm">{p.school_profiles?.school_name||'—'}</div>
                                  <div className="pay-dt">{fmtDate(p.created_at)} · {p.transaction_code}</div>
                                </div>
                              </div>
                              <div style={{textAlign:'right', minWidth: '100px'}}>
                                <div className="pay-v pos">+{fmtMoney(p.amount)}</div>
                                 <div className="pay-tp">Pending · M-PESA</div>
                              </div>
                              <div style={{display:'flex',gap:8, width: '100%', justifyContent:'flex-end'}}>
                                <button className="btn" style={{color:'var(--te)',borderColor:'rgba(13,216,138,.3)',background:'rgba(13,216,138,.05)'}} onClick={()=>handleApprove(p)}>Approve</button>
                                <button className="btn" style={{color:'var(--ro)',borderColor:'rgba(212,80,106,.3)',background:'rgba(212,80,106,.05)'} } onClick={()=>handleReject(p)}>Reject</button>
                              </div>
                            </div>
                          );
                        })
                      : activeSchools.length===0
                         ? <div className="empty"><div className="empty-ico">✅</div>No payments yet.</div>
                        : (q ? filteredSchools.filter(s=>s.school_profiles?.[0]?.subscription_status==='Active') : activeSchools).slice(0,6).map((s,i)=>{
                            const p=s.school_profiles?.[0]||{};
                            const cls=['ni-t','ni-v','ni-a','ni-r','ni-s'][i%5];
                            return (
                              <div className="pay" key={s.id}>
                                <div className="pay-l"><div className={`li-ico ${cls}`}>💳</div><div><div className="pay-nm">{s.name}</div><div className="pay-dt">{fmtDate(p.created_at||s.created_at)}</div></div></div>
                                <div style={{textAlign:'right'}}>
                                  <div className="pay-v pos">+{fmtMoney(planAmt(p.subscription_plan, settings))}</div>
                                   <div className="pay-tp" style={{textTransform:'capitalize'}}>M-PESA · {p.subscription_plan || 'Starter'}</div>
                                </div>
                              </div>
                            );
                          })
                    }
                  </div>
                  <div className="cp">
                    <div className="cp-hd"><div><div className="cp-lbl">Payment Volume This Year</div><div className="cp-val">{fmtMoney(totalRevenue)} <span className="cbadge cup">live</span></div></div></div>
                    <div className="chart-box"><canvas ref={payChartRef} height="200"/></div>
                  </div>
                </div>
              </div>}

              {/* #### PAYMENT HISTORY #### */}
              {activeTab==='history' && <div className="tv">
                <div className="lp">
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:8}}>
                    <div className="lp-t" style={{margin:0}}>All Payment Records ({allPayments.length})</div>
                  </div>
                  <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
                    <span style={{fontSize:'.6rem',color:'var(--sub)',textTransform:'uppercase',letterSpacing:'.08em'}}>Status:</span>
                    {['all','Pending','Approved','Rejected'].map(st=>(
                      <button key={st} className={`fbtn${historyStatusFilter===st?' on':''}`}
                        onClick={()=>setHistoryStatusFilter(st)}>
                        {st==='all'?'All':st}
                      </button>
                    ))}
                    <span style={{fontSize:'.6rem',color:'var(--sub)',textTransform:'uppercase',letterSpacing:'.08em',marginLeft:12}}>School:</span>
                    <select className="act-sel" value={historySchoolFilter}
                      onChange={e=>setHistorySchoolFilter(e.target.value)}>
                      <option value="all">All Schools</option>
                      {[...new Set(allPayments.map(p=>p.school_profiles?.school_name).filter(Boolean))].sort().map(nm=>(
                        <option key={nm} value={nm}>{nm}</option>
                      ))}
                    </select>
                  </div>
                  {(()=>{
                    const filtered = allPayments
                      .filter(p => historyStatusFilter==='all' || p.status===historyStatusFilter)
                      .filter(p => historySchoolFilter==='all' || p.school_profiles?.school_name===historySchoolFilter);
                     if (filtered.length===0) return <div className="empty"><div className="empty-ico">📋</div>No payment records found.</div>;
                    return (
                      <div className="tbl-w">
                        <table className="data-table sa-table">
                          <thead>
                            <tr><th>School</th><th>Amount</th><th>Code</th><th>Status</th><th className="hide-mobile">Plan</th><th>Date</th><th className="hide-mobile">Time</th></tr>
                          </thead>
                          <tbody>
                            {filtered.map(p=>{
                              const d = new Date(p.created_at);
                              const statusCls = p.status==='Approved'?'pill pill-g':p.status==='Rejected'?'pill pill-r':'pill pill-y';
                              return (
                                  <tr key={p.id}>
                                    <td data-label="School" className="td-b">{p.school_profiles?.school_name||'Unknown'}</td>
                                    <td data-label="Amount" className="td-m" style={{color:'var(--te)',fontWeight:700}}>{fmtMoney(p.amount)}</td>
                                    <td data-label="Code" style={{fontSize:'.7rem',fontFamily:'var(--fh)'}}>{p.transaction_code||'—'}</td>
                                    <td data-label="Status"><span className={statusCls}>{p.status}</span></td>
                                    <td data-label="Plan" className="hide-mobile" style={{textTransform:'capitalize'}}>{p.school_profiles?.subscription_plan||'—'}</td>
                                    <td data-label="Date">{d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</td>
                                    <td data-label="Time" className="hide-mobile" style={{fontSize:'.68rem',color:'var(--sub)'}}>{d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</td>
                                  </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              </div>}

              {/* ΓòÉΓòÉΓòÉΓòÉ SUBSCRIPTIONS ΓòÉΓòÉΓòÉΓòÉ */}
              {activeTab==='subscriptions' && <div className="tv">
                <div className="kpi-grid" style={{marginBottom:14}}>
                  {[
                    {a:'var(--te)', c:'ni-t',l:'Active',      i:'✅',v:pStats?.activeSchools || activeCount,  ch:`${totalSchools?Math.round((pStats?.activeSchools || activeCount)/totalSchools*100):0}% of total`, up:true },
                    {a:'var(--sub)',c:'ni-d',l:'Deactivated',  i:'🔒',v:pStats?.deactivatedSchools || schools.filter(s=>!isSchoolActive(s)).length, ch:'Awaiting payment', up:false},
                    {a:'var(--am)', c:'ni-a',l:'Suspended',    i:'⏸️',v:pStats?.suspendedSchools || 0, ch:'Admin action', up:false},
                    {a:'var(--ro)', c:'ni-r',l:'Expired',      i:'⚠️', v:pStats?.expiredSchools || expiredCount, ch:'Needs renewal', up:false},
                  ].map((k,i)=>(
                    <div className="kpi" key={i}>
                      <div className="kpi-accent" style={{background:k.a}}/>
                      <div className="kpi-hd"><span className="kpi-lbl">{k.l}</span><div className={`kpi-ico ${k.c}`}>{k.i}</div></div>
                      <div className="kpi-val">{k.v}</div>
                      <div className="kpi-ft"><span className={`kpi-ch ${k.up?'kup':'kdn'}`}>{k.ch}</span></div>
                    </div>
                  ))}
                </div>
                <div className="cp">
                  <div className="cp-hd"><div><div className="cp-lbl">Subscription Breakdown</div></div></div>
                  <div className="chart-box"><canvas ref={subBreakRef} height="220"/></div>
                </div>
              </div>}

              {/* ΓòÉΓòÉΓòÉΓòÉ REVENUE ΓòÉΓòÉΓòÉΓòÉ */}
              {activeTab==='revenue' && <div className="tv">
                <div className="cp">
                  <div className="cp-hd">
                    <div>
                      <div className="cp-lbl">Total Revenue — {revPeriodLabel}</div>
                      <div className="cp-val">{fmtMoney(totalRevenue)} {revChange!==null&&<span className={`cbadge ${revChangeUp?'cup':'cdn'}`}>{revChange>=0?'+':''}{revChange}% YoY</span>}</div>
                    </div>
                    <div style={{display:'flex',gap:5}}>
                      {['day','month','year'].map(p=>(
                        <button key={p} className={`act-btn${revPeriod===p?' active':''}`}
                          style={{fontSize:'.65rem',padding:'4px 9px',background:revPeriod===p?'var(--panel2)':undefined,color:revPeriod===p?'var(--txt)':undefined}}
                          onClick={()=>setRevPeriod(p)}>
                          {p.charAt(0).toUpperCase()+p.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="chart-box"><canvas ref={revBigRef} height="220"/></div>
                  <div style={{marginTop:14,display:'flex',gap:16,flexWrap:'wrap'}}>
                    {[
                      {l:'Active paying schools', v:activeCount, c:'var(--vi)'},
                      {l:'Revenue this period',   v:fmtMoney(totalRevenue), c:'var(--te)'},
                      {l:'Pending payments',      v:pendingPayments.length, c:'var(--am)'},
                      {l:'Expired accounts',      v:expiredCount, c:'var(--ro)'},
                    ].map((r,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'center',gap:6}}>
                        <span style={{width:8,height:8,borderRadius:2,background:r.c,flexShrink:0,display:'inline-block'}}/>
                        <span style={{fontSize:'.62rem',color:'var(--sub)'}}>{r.l}:</span>
                        <span style={{fontSize:'.68rem',fontFamily:'var(--fh)',color:r.c,fontWeight:700}}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>}

              {/* ΓòÉΓòÉΓòÉΓòÉ ACTIVITY ΓòÉΓòÉΓòÉΓòÉ */}
              {activeTab==='activity' && <div className="tv">
                <div className="lp">
                  <div className="lp-t" style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                    <span>Activity Log ({filteredActivity.length} entries)</span>
                  </div>
                  <p style={{fontSize: '.7rem', color: 'var(--sub)', marginBottom: 16, lineHeight: 1.6}}>
                    This log tracks all critical platform actions (registrations, plan changes, manual extensions, terminations) across all schools for security and audit purposes.
                  </p>
                  {filteredActivity.length===0
                    ? <div className="empty"><div className="empty-ico">⚡</div>No activity found.</div>
                    : filteredActivity.map(a=>(
                        <div className="ai" key={a.id}>
                          <div className="li-ico ni-v">⚡</div>
                          <div className="ai-body">
                            <div className="ai-t">{a.description}</div>
                            <div className="ai-s">{a.school_name||'System'} · {a.type?.split('_').join(' ')||'event'}</div>
                          </div>
                          <div className="ai-time">{new Date(a.created_at).toLocaleString('en-KE',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                        </div>
                      ))
                  }
                </div>
              </div>}

              {/* ΓòÉΓòÉΓòÉΓòÉ DATA RECOVERY ΓòÉΓòÉΓòÉΓòÉ */}
              {activeTab==='recovery' && <div className="tv">
                <div className="page-hd">
                  <div className="ph-left">
                    <div className="ph-ico">🩺</div>
                    <div>
                      <div className="ph-title">Data Discovery &amp; Recovery</div>
                      <div className="ph-sub">Integrity Audit &amp; Legacy Import</div>
                    </div>
                  </div>
                </div>

                <div className="bot-grid">
                  <div className="lp">
                    <div className="lp-t">Orphaned Schools ({discoveryMeta.orphans.length})</div>
                    <div style={{fontSize:'.68rem',color:'var(--sub)',marginBottom:16,lineHeight:1.4}}>
                      These accounts exist in the database but are missing metadata profiles. They currently do not appear in dashboard metrics.
                    </div>
                    {discoveryMeta.orphans.length === 0 ? (
                      <div className="empty">
                        <div className="empty-ico">✅</div>
                        No orphaned accounts found.
                      </div>
                    ) : (
                      discoveryMeta.orphans.map(s => (
                        <div className="li" key={s.id} style={{background:'rgba(255,255,255,0.02)',padding:12,borderRadius:8,marginBottom:8}}>
                          <div className="li-l">
                            <div className="li-ico ni-r">🏛️</div>
                            <div>
                              <div className="li-name">{s.name}</div>
                              <div className="li-sub">Created: {fmtDate(s.created_at)}</div>
                            </div>
                          </div>
                          <button 
                            className="act-btn" 
                            style={{background:'rgba(13,216,138,.1)',color:'var(--te)',borderColor:'rgba(13,216,138,.3)'}}
                            disabled={repairingId === s.id}
                            onClick={() => handleRepair(s.id, s.name)}
                          >
                            {repairingId === s.id ? 'Fixing...' : 'Repair & Link'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="lp">
                    <div className="lp-t">Legacy Discovery scanning</div>
                    <div style={{fontSize:'.68rem',color:'var(--sub)',marginBottom:16,lineHeight:1.4}}>
                      Identifying data in older/legacy tables that might belong to earlier versions of the platform.
                    </div>
                    {discoveryMeta.legacy.length === 0 ? (
                      <div className="empty" style={{opacity:.4}}>
                        <div className="empty-ico">🔍</div>
                        No legacy tables detected in primary schema.
                      </div>
                    ) : (
                      discoveryMeta.legacy.map(l => (
                        <div className="ig" key={l.table} style={{marginBottom:10,opacity:l.count>0?1:.5}}>
                          <div className="ig-l">
                            <div className="li-ico ni-s">📦</div>
                            <div>
                              <div className="ig-nm">Table: {l.table}</div>
                              <div style={{fontSize:'.55rem',color:'var(--sub)'}}>Found {l.count} records</div>
                            </div>
                          </div>
                          {l.count > 0 && <span className="pill pill-r" style={{fontSize:'.55rem'}}>Legacy Data</span>}
                        </div>
                      ))
                    )}
                    <div style={{marginTop:20,padding:12,background:'rgba(74,158,232,0.05)',borderRadius:8,border:'1px dashed rgba(74,158,232,0.2)'}}>
                      <div style={{fontSize:'.65rem',color:'var(--sk)',fontWeight:700,marginBottom:4}}>💡 Pro Tip</div>
                      <div style={{fontSize:'.6rem',color:'var(--sub)',lineHeight:1.4}}>
                        If common legacy tables match your previous platform versions, we can implement custom import scripts to pull that data into your modern Command Tower.
                      </div>
                    </div>
                  </div>
                </div>
              </div>}

              {/* ΓòÉΓòÉΓòÉΓòÉ SETTINGS ΓòÉΓòÉΓòÉΓòÉ */}
              {activeTab==='config' && <div className="tv">
                <div className="bot-grid" style={{marginBottom:12}}>
                  <div className="lp">
                    <div className="lp-t">⚙️ Global Settings</div>
                    <div style={{marginBottom:14}}>
                      <div className="sb-lbl" style={{marginBottom:6}}>Gateway Instructions</div>
                      <textarea rows={4} placeholder="Enter M-PESA gateway instructions..." value={gwInstructions} onChange={e=>setGwInstructions(e.target.value)}/>
                    </div>
                    <div style={{marginBottom:14}}>
                      <div className="sb-lbl" style={{marginBottom:6}}>Platform Status Message</div>
                      <input type="text" value={statusMsg} onChange={e=>setStatusMsg(e.target.value)}/>
                    </div>
                    <div style={{marginBottom:18}}>
                      <div className="sb-lbl" style={{marginBottom:6}}>Subscription End Date <span style={{color:'var(--sub)'}}>(all schools)</span></div>
                      <input type="date" value={subEndDate} onChange={e=>setSubEndDate(e.target.value)}/>
                      {subEndDate && expiryInfo && (
                        <div style={{marginTop:10,padding:'10px 13px',borderRadius:7,background:'rgba(212,80,106,.08)',border:'1px solid rgba(212,80,106,.18)'}}>
                          <div style={{fontSize:'.58rem',color:'var(--sub)',letterSpacing:'.07em',textTransform:'uppercase',marginBottom:4}}>All subscriptions auto-expire on</div>
                          <div style={{fontFamily:'var(--fh)',fontSize:'.88rem',fontWeight:700,color:'var(--ro)'}}>{expiryInfo.label}</div>
                          <div style={{fontSize:'.62rem',color:expiryInfo.color,marginTop:3}}>{expiryInfo.note}</div>
                        </div>
                      )}
                    </div>
                    <button className="save-btn" onClick={()=>{
                      let formattedDate = subEndDate;
                      if (subEndDate) {
                        const d = new Date(subEndDate);
                        if (!isNaN(d.getTime())) formattedDate = d.toISOString();
                      }
                      handleUpdateSetting('billing',{instructions:gwInstructions,expiry_date:formattedDate});
                      handleUpdateSetting('platform',{status_message:statusMsg});
                    }}>Save Changes</button>
                  </div>
                  <div className="lp">
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                      <div className="lp-t" style={{marginBottom:0}}>💰 Pricing Control</div>
                      <button onClick={()=>setPlans(p=>[...p,{id:'new_'+Date.now(),name:'New Plan',price:5000,limit:500,active:true,features:[]}])} 
                        style={{padding:'4px 10px',borderRadius:6,background:'rgba(124,92,252,.1)',border:'1px solid rgba(124,92,252,.2)',color:'var(--vi)',fontSize:'.65rem',fontWeight:700,cursor:'pointer'}}>+ Add Plan</button>
                    </div>
                    <p style={{fontSize:'.7rem',color:'var(--sub)',marginBottom:16,lineHeight:1.6}}>Set custom names, costs, and limits. Toggled plans appear globally on landing and registration pages.</p>
                    
                    {plans.map((p, idx)=>(
                      <div key={p.id} style={{background:'var(--bg)',border:'1px solid var(--edge)',borderRadius:8,padding:'12px 14px',marginBottom:10,opacity:p.active?1:.5,transition:'opacity .2s'}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                          <div style={{display:'flex',alignItems:'center',gap:8,flex:1}}>
                            <input type="text" value={p.name} onChange={e=>{const n=[...plans];n[idx].name=e.target.value;setPlans(n);}}
                              style={{background:'transparent',border:'none',padding:0,fontSize:'.82rem',fontWeight:700,width:'100%',color:'#fff',outline:'none'}} placeholder="Plan Name"/>
                          </div>
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            <label style={{display:'flex',alignItems:'center',gap:5,cursor:'pointer',userSelect:'none'}}>
                              <input type="checkbox" checked={p.active} onChange={e=>{const n=[...plans];n[idx].active=e.target.checked;setPlans(n);}} style={{accentColor:'var(--te)'}}/>
                              <span style={{fontSize:'.6rem',color:p.active?'var(--te)':'var(--sub)',fontWeight:600}}>{p.active?'Public':'Hidden'}</span>
                            </label>
                            <button onClick={()=>setPlans(plans.filter((_,i)=>i!==idx))} style={{background:'transparent',border:'none',color:'var(--ro)',fontSize:'11px',cursor:'pointer',padding:4}}>✕</button>
                          </div>
                        </div>
                        
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                          <div>
                            <div className="sb-lbl" style={{marginBottom:4,fontSize:'.55rem'}}>Price (KSh / term)</div>
                            <div style={{display:'flex',alignItems:'center',gap:6}}>
                              <input type="number" value={p.price} onChange={e=>{const n=[...plans];n[idx].price=Number(e.target.value);setPlans(n);}}
                                style={{flex:1,background:'var(--panel)',border:'1px solid var(--edge2)',borderRadius:6,padding:'6px 8px',color:'var(--txt)',fontFamily:'var(--fh)',fontSize:'.76rem'}}/>
                            </div>
                          </div>
                          <div>
                            <div className="sb-lbl" style={{marginBottom:4,fontSize:'.55rem'}}>Student Limit</div>
                            <input type="number" value={p.limit} onChange={e=>{const n=[...plans];n[idx].limit=Number(e.target.value);setPlans(n);}}
                              style={{width:'100%',background:'var(--panel)',border:'1px solid var(--edge2)',borderRadius:6,padding:'6px 8px',color:'var(--txt)',fontFamily:'var(--fh)',fontSize:'.76rem'}}/>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div style={{display:'flex',alignItems:'center',gap:8,marginTop:6}}>
                      <button className="save-btn" style={{flex:1}} onClick={async()=>{
                        const newPricing = {};
                        plans.forEach(p => {
                          const key = p.name.trim() || p.id;
                          newPricing[key] = {
                            price: p.price,
                            limit: p.limit,
                            active: p.active,
                            features: p.features || []
                          };
                        });
                        try {
                          await updatePlatformSetting('pricing', newPricing);
                          setPriceSaved(true);
                          setTimeout(()=>setPriceSaved(false),3000);
                          loadData();
                        } catch (err) {
                          setMessage({type:'error', text: err.message});
                        }
                      }}>Save Pricing</button>
                      <button onClick={()=>loadData()} style={{padding:'9px 14px',borderRadius:7,background:'transparent',border:'1px solid var(--edge2)',color:'var(--sub)',fontFamily:'var(--fb)',fontSize:'.76rem',cursor:'pointer'}}>Reset</button>
                    </div>
                    {priceSaved && <div style={{marginTop:10,padding:'8px 12px',borderRadius:7,background:'rgba(13,216,138,.1)',border:'1px solid rgba(13,216,138,.2)',fontSize:'.72rem',color:'var(--te)'}}>✓ Pricing updated successfully</div>}
                  </div>
                </div>
              </div>}



            <div style={{padding:'24px 0 6px',textAlign:'center',opacity:.2,borderTop:'1px solid var(--edge)',marginTop:20}}/>

            {/* ΓòÉΓòÉ ACTIVATE MODAL ΓòÉΓòÉ */}
            <div className={`mo${activateModal?' open':''}`} onClick={e=>{if(e.target===e.currentTarget)setActivateModal(null)}}>
              {activateModal && (
                <div className="mb">
                  <button className="mc" onClick={()=>setActivateModal(null)}>✕</button>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
                    <div className="li-ico ni-t" style={{width:36,height:36,borderRadius:9,fontSize:16}}>✅</div>
                    <div>
                      <div style={{fontFamily:'var(--fh)',fontSize:'.9rem',fontWeight:700,color:'#fff'}}>Confirm Payment &amp; Activate</div>
                      <div style={{fontSize:'.68rem',color:'var(--sub)',marginTop:2}}>School account will be activated immediately</div>
                    </div>
                  </div>
                  <div className="mi">
                    <div className="mir"><span className="mil">School</span><span className="miv">{activateModal.name}</span></div>
                    <div className="mir"><span className="mil">Plan</span><span style={{fontSize:'.75rem',color:'var(--txt)',textTransform:'capitalize'}}>{activateModal.school_profiles?.[0]?.subscription_plan||'Starter'} Plan</span></div>
                    <div className="mir"><span className="mil">Amount</span><span style={{fontFamily:'var(--fh)',fontSize:'.82rem',fontWeight:700,color:'var(--te)'}}>{fmtMoney(planAmt(activateModal.school_profiles?.[0]?.subscription_plan, settings))}</span></div>
                  </div>
                  <div style={{marginBottom:14}}>
                    <div className="sb-lbl" style={{marginBottom:7}}>Payment Method</div>
                    <div className="pms">
                      {[['mpesa','M-PESA','Paybill'],['cash','Cash','Manual'],['bank','Bank','Transfer']].map(([id,n,s])=>(
                        <div key={id} className={`pm${payMethod===id?' on':''}`} onClick={()=>setPayMethod(id)}>
                          <div className="pmt" style={{color:payMethod===id?'var(--te)':'var(--sub)'}}>{n}</div>
                          <div className="pms2">{s}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{marginBottom:20}}>
                    <div className="sb-lbl" style={{marginBottom:7}}>Payment Reference <span style={{color:'var(--dim)'}}>(optional)</span></div>
                    <input type="text" placeholder="e.g. QHX7K2P3 or receipt no." value={payRef} onChange={e=>setPayRef(e.target.value)} style={{fontFamily:'var(--fh)',fontSize:'.75rem'}}/>
                  </div>
                  {!activateSuccess
                    ? <button onClick={handleConfirmActivate} disabled={activating}
                        style={{width:'100%',padding:12,borderRadius:9,background:'linear-gradient(135deg,var(--te),#09A86A)',color:'#000',fontFamily:'var(--fb)',fontSize:'.88rem',fontWeight:700,border:'none',cursor:'pointer',boxShadow:'0 4px 18px rgba(13,216,138,.3)',opacity:activating?.7:1}}>
                        {activating?'Activating...':'Confirm Payment & Activate Account'}
                      </button>
                    : <div style={{textAlign:'center',marginTop:16}}>
                        <div style={{fontSize:'1.8rem',marginBottom:8}}>✅</div>
                        <div style={{fontFamily:'var(--fh)',fontSize:'.88rem',fontWeight:700,color:'var(--te)',marginBottom:4}}>Account Activated!</div>
                        <div style={{fontSize:'.72rem',color:'var(--sub)'}}>{activateModal.name} is now active.{payRef?` Ref: ${payRef}`:''}</div>
                      </div>
                  }
                </div>
              )}
            </div>

            {/* 🔄🔄 CHANGE PLAN MODAL 🔄🔄 */}
            <div className={`mo${planModal?' open':''}`} onClick={e=>{if(e.target===e.currentTarget){setPlanModal(null);setChosenPlan('');}}}>
              {planModal && (
                <div className="mb" style={{maxWidth:400}}>
                  <button className="mc" onClick={()=>{setPlanModal(null);setChosenPlan('');}}>✕</button>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
                    <div className="li-ico ni-s" style={{width:36,height:36,borderRadius:9,fontSize:16}}>🔄</div>
                    <div>
                      <div style={{fontFamily:'var(--fh)',fontSize:'.9rem',fontWeight:700,color:'#fff'}}>Change Subscription</div>
                      <div style={{fontSize:'.68rem',color:'var(--sub)',marginTop:2}}>{planModal.schoolName}</div>
                    </div>
                  </div>
                  <div style={{background:'var(--bg)',border:'1px solid var(--edge)',borderRadius:8,padding:'10px 13px',marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <span style={{fontSize:'.65rem',color:'var(--sub)'}}>Current plan</span>
                    <span style={{fontFamily:'var(--fh)',fontSize:'.75rem',fontWeight:700,color:'var(--txt)',textTransform:'capitalize'}}>{planModal.currentPlan} Plan</span>
                  </div>
                  <div style={{marginBottom:18}}>
                    <div className="sb-lbl" style={{marginBottom:8}}>Select new plan</div>
                    {Object.entries(settings?.pricing || {}).map(([plan, p]) => {
                      const isCur = plan.toLowerCase() === planModal.currentPlan?.toLowerCase();
                      const isSel = chosenPlan === plan;
                      return (
                        <div key={plan} className={`po${isSel ? ' sel' : ''}${isCur ? ' cur' : ''}`} onClick={() => !isCur && setChosenPlan(plan)}>
                          <div>
                            <div style={{ fontSize: '.76rem', fontWeight: 600, color: 'var(--txt)' }}>{plan}</div>
                            <div style={{ fontSize: '.6rem', color: 'var(--sub)', marginTop: 2 }}>Up to {p.limit?.toLocaleString() || 0} students</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {isCur && <span style={{ fontSize: '.6rem', color: 'var(--sub)' }}>Current</span>}
                            {isSel && !isCur && <span style={{ fontSize: '.7rem', color: 'var(--sk)' }}>✓</span>}
                            <span style={{ fontFamily: 'var(--fh)', fontSize: '.72rem', color: 'var(--sub)' }}>KSh {p.price?.toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={handleChangePlan} disabled={!chosenPlan||planSaving}
                    style={{width:'100%',padding:12,borderRadius:9,background:chosenPlan?'linear-gradient(135deg,var(--sk),#2B7FD4)':'var(--dim)',color:chosenPlan?'#fff':'var(--sub)',fontFamily:'var(--fb)',fontSize:'.88rem',fontWeight:600,border:'none',cursor:chosenPlan?'pointer':'not-allowed',opacity:planSaving?.7:1,transition:'all .25s'}}>
                    {planSaving?'Updating...':chosenPlan?`Confirm — Switch to ${chosenPlan} Plan`:'Select a plan above'}
                  </button>
                </div>
              )}
            </div>

            {/* ☠️☠️ DELETE CONFIRMATION MODAL ☠️☠️ */}
            <div className={`mo${deleteModal?' open':''}`} onClick={e=>{if(e.target===e.currentTarget)setDeleteModal(null)}}>
              {deleteModal && (
                <div className="mb" style={{borderColor:'var(--ro)'}}>
                  <button className="mc" onClick={()=>setDeleteModal(null)}>✕</button>
                  <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
                    <div className="li-ico ni-r" style={{width:42,height:42,borderRadius:10,fontSize:20}}>☠️</div>
                    <div>
                      <div style={{fontFamily:'var(--fh)',fontSize:'1rem',fontWeight:700,color:'var(--ro)'}}>Terminate School</div>
                      <div style={{fontSize:'.72rem',color:'var(--sub)',marginTop:2}}>Irreversible administrative action</div>
                    </div>
                  </div>
                  
                  <div style={{background:'rgba(212,80,106,.05)',border:'1px solid rgba(212,80,106,.2)',borderRadius:10,padding:16,marginBottom:20}}>
                    <div style={{fontSize:'.8rem',color:'#fff',fontWeight:600,marginBottom:6}}>Are you absolutely sure?</div>
                    <div style={{fontSize:'.72rem',color:'var(--sub)',lineHeight:1.5}}>
                      You are about to permanently delete <strong style={{color:'var(--txt)'}}>{deleteModal.name}</strong> and all associated profiles, payments, and data. This cannot be undone.
                    </div>
                  </div>

                  <div style={{display:'flex',gap:10}}>
                    <button className="act-btn" style={{flex:1,padding:12,borderRadius:9,fontSize:'.82rem'}} onClick={()=>setDeleteModal(null)}>No, Cancel</button>
                    <button className="save-btn" disabled={deleting} onClick={handleDeleteSchool}
                      style={{flex:1.4,background:'var(--ro)',boxShadow:'0 4px 18px rgba(212,80,106,.3)',padding:12,borderRadius:9,fontSize:'.82rem',fontWeight:700}}>
                      {deleting ? 'Terminating...' : 'Yes, Terminate School'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 👩‍🏫👩‍🏫 STAFF MANAGEMENT MODAL 👩‍🏫👩‍🏫 */}
            <div className={`mo${staffModal ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) setStaffModal(null) }}>
              {staffModal && (
                <div className="mb" style={{ maxWidth: 500 }}>
                  <button className="mc" onClick={() => setStaffModal(null)}>✕</button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <div className="li-ico ni-v" style={{ width: 36, height: 36, borderRadius: 9, fontSize: 16 }}>👩‍🏫</div>
                    <div>
                      <div style={{ fontFamily: 'var(--fh)', fontSize: '.9rem', fontWeight: 700, color: '#fff' }}>Manage Staff</div>
                      <div style={{ fontSize: '.68rem', color: 'var(--sub)', marginTop: 2 }}>{staffModal.name}</div>
                    </div>
                  </div>

                  <div className="tbl-w" style={{ maxHeight: 300, overflowY: 'auto', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--edge)' }}>
                    {loadingStaff ? (
                      <div style={{ padding: 40, textAlign: 'center' }}><div className="spin" style={{ margin: '0 auto 10px' }} />Loading staff...</div>
                    ) : staffModal.staff.length === 0 ? (
                      <div className="empty" style={{ padding: 30 }}>No staff accounts found.</div>
                    ) : (
                      <table>
                        <thead>
                          <tr><th>Name</th><th>Phone/Status</th><th>Action</th></tr>
                        </thead>
                        <tbody>
                          {staffModal.staff.map(t => (
                            <tr key={t.id}>
                              <td>
                                <div style={{ fontSize: '.75rem', fontWeight: 600 }}>{t.name}</div>
                                <div style={{ fontSize: '.6rem', color: 'var(--sub)' }}>{t.id.slice(0, 8)}</div>
                              </td>
                              <td>
                                <div style={{ fontSize: '.7rem' }}>{t.phone || '—'}</div>
                                <span className={sPill(t.status)} style={{ fontSize: '9px' }}>{t.status}</span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button className="act-btn" style={{ color: 'var(--ro)', borderColor: 'rgba(212,80,106,.2)', padding: '3px 8px', fontSize: '10px' }}
                                  onClick={() => handleDeleteStaff(t.id, t.name)}>Delete</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div style={{ marginTop: 20, fontSize: '.65rem', color: 'var(--sub)', lineHeight: 1.4, padding: '0 4px' }}>
                    <strong>Note:</strong> Deleting a staff member will permanently remove their portal access and grading/attendance assignments.
                  </div>
                </div>
              )}
            </div>

                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
