/**
 * Internationalization Configuration
 * Supports English and French with react-i18next
 * Includes comprehensive translation keys for offline-first features
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // App title and navigation
      app_title: 'Family Planner',
      home: 'Home',
      settings: 'Settings',
      logout: 'Logout',
      login: 'Login',

      // Offline/Online status
      offline: 'Offline Mode',
      online: 'Online',
      offline_description: 'You are in offline mode. Changes will sync when back online.',
      syncing: 'Syncing changes...',
      sync_complete: 'All changes synced',
      pending_changes: 'Pending changes',
      sync_error: 'Sync failed',
      retry_sync: 'Retry Sync',

      // General actions
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      close: 'Close',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',

      // Form labels
      email: 'Email',
      password: 'Password',
      name: 'Name',
      description: 'Description',
      date: 'Date',
      time: 'Time',

      // Accessibility
      menu: 'Menu',
      close_menu: 'Close menu',
      required_field: 'This field is required',
      invalid_email: 'Please enter a valid email',

      // Touch UI specific
      swipe_to_navigate: 'Swipe to navigate',
      long_press_for_options: 'Long press for options',
      tap_to_close: 'Tap to close',
    },
  },
  fr: {
    translation: {
      // App title and navigation
      app_title: 'Planificateur Familial',
      home: 'Accueil',
      settings: 'Paramètres',
      logout: 'Déconnexion',
      login: 'Connexion',

      // Offline/Online status
      offline: 'Mode Hors Ligne',
      online: 'En Ligne',
      offline_description: 'Vous êtes hors ligne. Les modifications se synchroniseront une fois en ligne.',
      syncing: 'Synchronisation des modifications...',
      sync_complete: 'Toutes les modifications sont synchronisées',
      pending_changes: 'Modifications en attente',
      sync_error: 'Échec de la synchronisation',
      retry_sync: 'Réessayer la synchronisation',

      // General actions
      save: 'Enregistrer',
      cancel: 'Annuler',
      delete: 'Supprimer',
      edit: 'Modifier',
      add: 'Ajouter',
      close: 'Fermer',
      loading: 'Chargement...',
      error: 'Erreur',
      success: 'Succès',

      // Form labels
      email: 'Email',
      password: 'Mot de passe',
      name: 'Nom',
      description: 'Description',
      date: 'Date',
      time: 'Heure',

      // Accessibility
      menu: 'Menu',
      close_menu: 'Fermer le menu',
      required_field: 'Ce champ est requis',
      invalid_email: 'Veuillez entrer une adresse e-mail valide',

      // Touch UI specific
      swipe_to_navigate: 'Faites glisser pour naviguer',
      long_press_for_options: 'Appuyez longuement pour les options',
      tap_to_close: 'Appuyez pour fermer',
    },
  },
};

/**
 * Initialize i18next with react-i18next
 */
export function initI18n() {
  if (!i18n.isInitialized) {
    i18n
      .use(initReactI18next)
      .init({
        resources,
        fallbackLng: 'en',
        lng: localStorage.getItem('language') || navigator.language.split('-')[0] || 'en',
        interpolation: {
          escapeValue: false,
        },
        react: {
          useSuspense: false,
        },
      });
  }
  return i18n;
}

/**
 * Get current language
 */
export function getCurrentLanguage(): string {
  const stored = localStorage.getItem('language');
  if (stored && Object.keys(resources).includes(stored)) {
    return stored;
  }

  const browserLang = navigator.language.split('-')[0];
  return Object.keys(resources).includes(browserLang) ? browserLang : 'en';
}

/**
 * Set language
 */
export function setLanguage(language: string): void {
  if (Object.keys(resources).includes(language)) {
    localStorage.setItem('language', language);
    i18n.changeLanguage(language);
  }
}

/**
 * Get supported languages
 */
export function getSupportedLanguages(): string[] {
  return Object.keys(resources);
}

export const i18nConfig = {
  resources,
  defaultLanguage: 'en',
  supportedLanguages: Object.keys(resources),
};

export default i18n;
