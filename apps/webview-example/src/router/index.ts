import { createRouter, createWebHashHistory } from 'vue-router';
import HistoryView from '../views/HistoryView.vue';
import AppModelDesignerView from '../views/HomeView.vue';

const routes = [
  { path: '', name: 'designer', component: AppModelDesignerView },
  { path: '/history', name: 'history', component: HistoryView }
];

const router = createRouter({
  history: createWebHashHistory(), // ✅ 使用 hash 模式
  routes: routes
});

export { router };
