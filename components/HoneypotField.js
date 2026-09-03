// Campo "armadilha" invisível para pessoas, mas que a maioria dos robôs de
// spam automáticos preenche sem saber (porque não conseguem "ver" a página
// como uma pessoa vê — só leem o HTML e preenchem todos os campos que
// encontram). Se este campo vier preenchido, sabemos que não foi uma
// pessoa a enviar o formulário.
//
// Como usar:
// 1. Adiciona um estado: const [website, setWebsite] = useState('');
// 2. Põe <HoneypotField value={website} onChange={setWebsite} /> dentro do <form>.
// 3. Na função de submissão, logo no início: if (website) return; (rejeita
//    em silêncio, sem dizer nada ao robô — simplesmente não acontece nada).
export default function HoneypotField({ value, onChange }) {
  return (
    <input
      type="text"
      name="website"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      style={{
        position: 'absolute', left: '-9999px', width: 1, height: 1,
        opacity: 0, pointerEvents: 'none',
      }}
    />
  );
}
