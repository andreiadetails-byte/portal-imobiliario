'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/Header';
import BackButton from '../../components/BackButton';
import { useLanguage } from '../../lib/i18n';
import { isPasswordValid, PASSWORD_RULES_TEXT } from '../../lib/passwordRules';
import { compressImageFile } from '../../lib/imageCompression';
import { isProfessionalAccount, accountTypeLabel } from '../../lib/accountTypes';
import { PAYMENT_INFO } from '../../lib/paymentInfo';

export default function PerfilPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [amiLicense, setAmiLicense] = useState('');
  const [accountType, setAccountType] = useState('particular');
  const [originalAccountType, setOriginalAccountType] = useState('particular');
  const [nif, setNif] = useState('');
  const [phone, setPhone] = useState('');
  const [showPhonePublic, setShowPhonePublic] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) { router.push('/login'); return; }
      setUser(currentUser);

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
      if (profile) {
        setFullName(profile.full_name || '');
        setAgencyName(profile.agency_name || '');
        setAmiLicense(profile.agency_license || '');
        setAccountType(profile.account_type || 'particular');
        setOriginalAccountType(profile.account_type || 'particular');
        setNif(profile.nif || '');
        setPhone(profile.phone_real || '');
        setShowPhonePublic(!!profile.show_phone_public);
        setAvatarPreview(profile.avatar_url || null);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  function handleAvatarSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarRemoved(false);
  }

  function handleRemoveAvatar() {
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarRemoved(true);
  }

  function handleAccountTypeChange(newType) {
    const wasParticular = accountType === 'particular';
    const becomingProfessional = isProfessionalAccount(newType);

    if (wasParticular && becomingProfessional && PAYMENT_INFO.subscriptionEnforced) {
      const confirmed = confirm(
        `Ao mudar para "${accountTypeLabel(newType)}", o seu primeiro mês fica grátis, com acesso total ao painel. ` +
        `Depois desse período, a mensalidade passa a ser de ${PAYMENT_INFO.subscriptionFee.toFixed(2)} €/mês, por transferência bancária. Quer continuar?`
      );
      if (!confirmed) return;
    }
    setAccountType(newType);
  }

  async function saveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSaved(false);

    let avatar_url;
    if (avatarFile) {
      const compressedAvatar = await compressImageFile(avatarFile);
      const ext = compressedAvatar.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from('property-photos').upload(path, compressedAvatar, { upsert: true, cacheControl: '31536000' });
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('property-photos').getPublicUrl(path);
        avatar_url = publicUrlData.publicUrl;
      }
    }

    // Se está a mudar de "particular" para um tipo profissional agora,
    // atribui o mês grátis, tal como acontece no registo normal.
    let freeMonthFields = {};
    if (originalAccountType === 'particular' && isProfessionalAccount(accountType) && PAYMENT_INFO.subscriptionEnforced) {
      const freeUntil = new Date();
      freeUntil.setMonth(freeUntil.getMonth() + 1);
      freeMonthFields = { subscription_status: 'active', subscription_paid_until: freeUntil.toISOString().slice(0, 10) };
    }

    const updates = {
      full_name: fullName,
      account_type: accountType,
      nif: nif || null,
      agency_name: accountType === 'agencia' ? agencyName : null,
      agency_license: isProfessionalAccount(accountType) ? amiLicense : null,
      phone_real: phone || null,
      show_phone_public: showPhonePublic,
      ...freeMonthFields,
    };
    if (avatar_url) updates.avatar_url = avatar_url;
    else if (avatarRemoved) updates.avatar_url = null;

    await supabase.from('profiles').update(updates).eq('id', user.id);
    setOriginalAccountType(accountType);

    setSavingProfile(false);
    setAvatarRemoved(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  }

  async function savePassword(e) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSaved(false);

    // Quem entrou só pelo Google nunca teve palavra-passe — não faz sentido
    // pedir para confirmar uma que nunca existiu. Nesse caso, definir uma
    // nova passa a servir também para poder entrar sem o Google no futuro.
    const hasPasswordAlready = user?.identities?.some((i) => i.provider === 'email');

    if (hasPasswordAlready && !currentPassword) {
      setPasswordError('Introduza a sua palavra-passe atual, para confirmarmos que é mesmo você.');
      return;
    }
    if (!isPasswordValid(newPassword)) {
      setPasswordError(PASSWORD_RULES_TEXT);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('perfil_passwords_dont_match'));
      return;
    }

    setSavingPassword(true);

    if (hasPasswordAlready) {
      // Confirma a palavra-passe atual antes de deixar mudar — sem isto,
      // alguém que ficasse com acesso à sua sessão (ex: computador partilhado)
      // conseguia mudar a palavra-passe sem saber a antiga, e ficava com a
      // conta, sem si conseguir voltar a entrar.
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (verifyError) {
        setSavingPassword(false);
        setPasswordError('A palavra-passe atual está incorreta.');
        return;
      }
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);

    if (error) {
      setPasswordError(error.message);
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordSaved(true);
    setTimeout(() => setPasswordSaved(false), 3000);
  }

  if (loading) return (<><Header /><div className="wrap" style={{ padding: 60 }}>{t('perfil_loading')}</div></>);

  return (
    <>
      <Header />
      <main id="main-content" className="wrap" style={{ maxWidth: 560, paddingTop: 48, paddingBottom: 80 }}>
        <BackButton fallback="/" />
        <h1 className="display" style={{ fontSize: 26, marginBottom: 28 }}>{t('perfil_title')}</h1>

        <form onSubmit={saveProfile} className="card" style={{ padding: 24, marginBottom: 24 }}>
          <h2 className="display" style={{ fontSize: 18, marginBottom: 18 }}>{t('perfil_profile')}</h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreview} alt={t('attr_profile_photo_alt')} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: 72, height: 72, borderRadius: '50%', background: 'var(--azulejo)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 600,
              }}>
                {(fullName || '?')[0].toUpperCase()}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <label htmlFor="avatar-input" className="btn" style={{ fontSize: 13, cursor: 'pointer' }}>
                {t('perfil_change_photo')}
              </label>
              <input id="avatar-input" type="file" accept="image/*" onChange={handleAvatarSelect} style={{ display: 'none' }} />
              {avatarPreview && (
                <button type="button" onClick={handleRemoveAvatar} className="btn" style={{ fontSize: 13, color: '#8a3b2a', borderColor: '#8a3b2a' }}>
                  {t('perfil_remove_photo')}
                </button>
              )}
            </div>
          </div>

          <div className="field">
            <label htmlFor="full-name-input">{t('perfil_fullname')}</label>
            <input id="full-name-input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>

          <div className="field">
            <label htmlFor="account-type-select">{t('perfil_account_type') || 'Tipo de conta'}</label>
            <select id="account-type-select" value={accountType} onChange={(e) => handleAccountTypeChange(e.target.value)}>
              <option value="particular">{accountTypeLabel('particular')}</option>
              <option value="agencia">{accountTypeLabel('agencia')}</option>
              <option value="consultor">{accountTypeLabel('consultor')}</option>
              <option value="promotor">{accountTypeLabel('promotor')}</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="nif-input">NIF <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>(opcional)</span></label>
            <input id="nif-input" value={nif} onChange={(e) => setNif(e.target.value)} placeholder="ex: 123456789" />
          </div>

          {accountType === 'agencia' && (
            <div className="field">
              <label htmlFor="agency-name-input">{t('perfil_agency_name')}</label>
              <input id="agency-name-input" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} />
            </div>
          )}

          {isProfessionalAccount(accountType) && (
            <div className="field">
              <label htmlFor="ami-input">{t('perfil_ami')}</label>
              <input id="ami-input" value={amiLicense} onChange={(e) => setAmiLicense(e.target.value)} placeholder="ex: 12345" />
            </div>
          )}

          <div className="field">
            <label>{t('perfil_email')}</label>
            <input value={user.email} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
          </div>

          <div className="field">
            <label htmlFor="phone-input">{t('perfil_phone')} <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>{t('perfil_phone_optional')}</span></label>
            <input id="phone-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="912 345 678" />
            {phone && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowPhonePublic(true)}
                  className="btn"
                  style={{
                    fontSize: 12.5, flex: 1,
                    background: showPhonePublic ? 'var(--azulejo)' : 'transparent',
                    color: showPhonePublic ? '#fff' : 'var(--ink)',
                    borderColor: showPhonePublic ? 'var(--azulejo)' : 'var(--line)',
                  }}
                >
                  {t('perfil_show_phone')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPhonePublic(false)}
                  className="btn"
                  style={{
                    fontSize: 12.5, flex: 1,
                    background: !showPhonePublic ? 'var(--azulejo)' : 'transparent',
                    color: !showPhonePublic ? '#fff' : 'var(--ink)',
                    borderColor: !showPhonePublic ? 'var(--azulejo)' : 'var(--line)',
                  }}
                >
                  {t('perfil_hide_phone')}
                </button>
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary" disabled={savingProfile}>
            {savingProfile ? t('perfil_saving') : t('perfil_save')}
          </button>
          {profileSaved && <span style={{ fontSize: 12.5, color: 'var(--telha)', marginLeft: 12 }}>✓ {t('perfil_saved')}</span>}
        </form>

        <form onSubmit={savePassword} className="card" style={{ padding: 24 }}>
          <h2 className="display" style={{ fontSize: 18, marginBottom: 18 }}>{t('perfil_change_password')}</h2>

          {user?.identities?.some((i) => i.provider === 'email') ? (
            <div className="field">
              <label htmlFor="current-password-input">{t('perfil_current_password')}</label>
              <input id="current-password-input" type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
            </div>
          ) : (
            <p style={{ fontSize: 12.5, color: 'var(--text-soft)', marginBottom: 16 }}>
              A sua conta entrou pelo Google, e ainda não tem palavra-passe definida. Ao definir uma agora, passa também a poder entrar diretamente com o email, sem precisar do Google.
            </p>
          )}
          <div className="field">
            <label htmlFor="new-password-input">{t('perfil_new_password')}</label>
            <input id="new-password-input" type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t('perfil_password_min')} autoComplete="new-password" />
          </div>
          <div className="field">
            <label htmlFor="confirm-password-input">{t('perfil_confirm_password')}</label>
            <input id="confirm-password-input" type="password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
          </div>

          {passwordError && <p className="error-text">{passwordError}</p>}

          <button type="submit" className="btn btn-primary" disabled={savingPassword}>
            {savingPassword ? t('perfil_saving') : t('perfil_change_password_btn')}
          </button>
          {passwordSaved && <span style={{ fontSize: 12.5, color: 'var(--telha)', marginLeft: 12 }}>✓ {t('perfil_password_changed')}</span>}
        </form>
      </main>
    </>
  );
}
