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
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [sendingSuggestion, setSendingSuggestion] = useState(false);
  const [suggestionSent, setSuggestionSent] = useState(false);

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
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Só são aceites imagens JPG, PNG ou WEBP.');
      return;
    }
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

    if (!isPasswordValid(newPassword)) {
      setPasswordError(PASSWORD_RULES_TEXT);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('perfil_passwords_dont_match'));
      return;
    }

    setSavingPassword(true);

    // Não é preciso confirmar a palavra-passe atual — quem está aqui já
    // tem sessão iniciada (autenticada), o que já garante que é mesmo o
    // dono da conta.
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);

    if (error) {
      setPasswordError(error.message);
      return;
    }
    setNewPassword('');
    setConfirmPassword('');
    setPasswordSaved(true);
    setTimeout(() => setPasswordSaved(false), 3000);
  }

  async function handleSendAsSuggestion() {
    setSendingSuggestion(true);
    await supabase.from('support_requests').insert({
      agent_name: 'Sofia',
      name: fullName || user?.email || 'Utilizador',
      contact: user?.email || '',
      message: `[Mensagem deixada ao tentar eliminar a conta, sem chegar a eliminar]\n\n${deleteReason.trim()}`,
      user_id: user?.id || null,
    });
    setSendingSuggestion(false);
    setSuggestionSent(true);
    setDeleteReason('');
    setTimeout(() => { setShowDeleteAccount(false); setSuggestionSent(false); }, 3000);
  }

  async function handleDeleteAccount() {
    setDeleteError('');
    setDeletingAccount(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/delete-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ reason: deleteReason.trim() }),
    });
    if (res.ok) {
      await supabase.auth.signOut();
      router.push('/');
    } else {
      const { error } = await res.json();
      setDeleteError(error || 'Não foi possível eliminar a conta. Tente novamente.');
      setDeletingAccount(false);
    }
  }

  if (loading) return (<><Header /><div className="wrap" style={{ padding: 60, background: 'var(--paper)', borderRadius: 16, marginTop: 24 }}>{t('perfil_loading')}</div></>);

  return (
    <>
      <Header />
      <main id="main-content" className="wrap" style={{ maxWidth: 560, paddingTop: 24, paddingBottom: 56, background: 'var(--paper)', borderRadius: 16, marginTop: 24, paddingLeft: 32, paddingRight: 32 }}>
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
            <label htmlFor="full-name-input">{t('perfil_fullname')} <span style={{ fontWeight: 400, fontSize: 12, color: '#8a3b2a' }}>*obrigatório</span></label>
            <input id="full-name-input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>

          <div className="field">
            <label htmlFor="account-type-select">{t('perfil_account_type') || 'Tipo de conta'} <span style={{ fontWeight: 400, fontSize: 12, color: '#8a3b2a' }}>*obrigatório</span></label>
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
            <label>{t('perfil_email')} <span style={{ fontWeight: 400, fontSize: 12, color: '#8a3b2a' }}>*obrigatório</span></label>
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

          {!user?.identities?.some((i) => i.provider === 'email') && (
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

        <div className="card" style={{ padding: 24, marginTop: 24, borderColor: '#e0c9c0' }}>
          {!showDeleteAccount ? (
            <button
              type="button"
              onClick={() => setShowDeleteAccount(true)}
              style={{ background: 'none', border: 'none', color: '#8a3b2a', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
            >
              Quero eliminar a minha conta
            </button>
          ) : (
            <div>
              <h2 className="display" style={{ fontSize: 17, marginBottom: 10, color: '#8a3b2a' }}>Eliminar a minha conta</h2>
              <p style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.6, marginBottom: 14 }}>
                Antes de avançar, temos pena de o ver sair. O More·ada foi feito para juntar particulares, agências e profissionais num só sítio, sem intermediários obrigatórios — a comunidade só cresce e melhora com quem cá está. Se houver algo que possamos corrigir ou melhorar, diga-nos, temos todo o gosto em ouvir.
              </p>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Tem mesmo a certeza? Esta ação é definitiva e não pode ser desfeita — todos os seus anúncios, mensagens e favoritos serão apagados.</p>
              <div className="field">
                <label htmlFor="delete-reason">Pode dizer-nos porquê? (opcional, mas ajuda-nos a melhorar)</label>
                <textarea id="delete-reason" rows={3} value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} placeholder="ex: já encontrei o que procurava, não voltei a usar, preços, outro motivo..." />
              </div>
              {deleteError && <p className="error-text">{deleteError}</p>}
              {suggestionSent && (
                <p style={{ fontSize: 12.5, color: 'var(--telha)', marginBottom: 10 }}>✓ Obrigado! A sua mensagem foi enviada para a nossa equipa.</p>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleSendAsSuggestion}
                  disabled={sendingSuggestion || !deleteReason.trim()}
                  className="btn"
                >
                  {sendingSuggestion ? 'A enviar...' : 'Não eliminar, mas enviar esta mensagem à equipa'}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount}
                  className="btn"
                  style={{ background: '#8a3b2a', color: '#fff', borderColor: '#8a3b2a' }}
                >
                  {deletingAccount ? 'A eliminar...' : 'Sim, eliminar definitivamente'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
