async function resetStuToBirth(id){
  const s=DB.students.find(x=>x.id===id);if(!s)return;
  if(!validBirth(s.birthdate))return banner('นักเรียนยังไม่มีวันเกิด — กรอกวันเกิดก่อนรีเซ็ต',true);
  if(!confirm(`รีเซ็ตรหัสผ่านของ "${s.name}" กลับเป็นวันเกิด (${fmtBirth(s.birthdate)})?\nนักเรียนจะถูกบังคับให้ตั้งรหัสใหม่ตอนเข้าระบบครั้งถัดไป`))return;
  
  banner('กำลังรีเซ็ตรหัสผ่าน...');
  
  // เก็บแฮชของวันเกิดเป็นรหัสชั่วคราว
  const birthHash = await sha256(s.birthdate);
  
  const {error} = await sb.from('students').update({
    temp_pw: birthHash,
    must_change: true
  }).eq('id', id);
  
  if(error){
    return banner('รีเซ็ตไม่สำเร็จ: ' + error.message, true);
  }
  
  s.temp_pw = birthHash;
  s.mustChange = true;
  logAction({type:'student',detail:'รีเซ็ตรหัสนักเรียนเป็นวันเกิด',byName:s.name});
  save();
  
  banner(`✅ รีเซ็ตแล้ว · รหัสชั่วคราว: ${fmtBirth(s.birthdate)}`);
  studentModal(id);
}
async function setStuTempPw(id){
  const s=DB.students.find(x=>x.id===id);if(!s)return;
  const tmp=prompt(`กำหนดรหัสชั่วคราวให้ "${s.name}" (อย่างน้อย 6 ตัวอักษร)\nนักเรียนจะถูกบังคับให้ตั้งรหัสใหม่หลังเข้าระบบ`);
  if(tmp===null)return;
  const t=tmp.trim();
  if(t.length<6)return banner('รหัสชั่วคราวอย่างน้อย 6 ตัวอักษร (ตาม Supabase)',true);
  
  banner('กำลังตั้งรหัสชั่วคราว...');
  
  const tempHash = await sha256(t);
  
  const {error} = await sb.from('students').update({
    temp_pw: tempHash,
    must_change: true
  }).eq('id', id);
  
  if(error){
    return banner('ตั้งรหัสไม่สำเร็จ: ' + error.message, true);
  }
  
  s.temp_pw = tempHash;
  s.mustChange = true;
  logAction({type:'student',detail:'ตั้งรหัสชั่วคราวให้นักเรียน',byName:s.name});
  save();
  
  banner('✅ ตั้งรหัสชั่วคราวแล้ว: '+t);
  studentModal(id);
}
async function tryLogin(){
  const un=ge('login-un').value.trim(),pw=ge('login-pw').value;
  if(!un||!pw)return banner('กรอกให้ครบ',true);
  const isStudent=/^s\d+$/.test(un);
  
  if(isStudent){
    const s=DB.students.find(x=>x.code===un);
    if(!s)return banner('ไม่พบนักเรียนนี้',true);
    
    // 🔹 ถ้ามีรหัสชั่วคราว ให้เช็คก่อน
    if(s.temp_pw){
      const hash = await sha256(pw);
      if(hash === s.temp_pw){
        // เข้าด้วยรหัสชั่วคราวสำเร็จ!
        SESSION={role:'student',uid:s.id};
        save();
        banner('เข้าด้วยรหัสชั่วคราว — กรุณาตั้งรหัสใหม่');
        return showForceChangePw();
      }
    }
    
    // 🔹 ถ้าไม่มี temp_pw หรือไม่ตรง ให้ลองเข้าด้วย Auth ปกติ
    if(!s.user_id){
      return banner('นักเรียนยังไม่มีบัญชี — ติดต่อครู',true);
    }
    
    const email = s.email || `${s.code}@students.local`;
    const {data,error} = await sb.auth.signInWithPassword({email,password:pw});
    
    if(error){
      // 🔹 ถ้าเข้าไม่ได้ แต่มีวันเกิด ลอง fallback
      if(s.birthdate && pw === s.birthdate){
        SESSION={role:'student',uid:s.id};
        save();
        banner('เข้าด้วยวันเกิด — กรุณาตั้งรหัสใหม่');
        return showForceChangePw();
      }
      return banner('รหัสผ่านไม่ถูกต้อง',true);
    }
    
    // เข้าสำเร็จ
    SESSION={role:'student',uid:s.id,auth_id:data.user.id};
    save();
    
    if(s.mustChange) return showForceChangePw();
    return studentDash();
  }
  
  // ... โค้ดสำหรับครู/ผู้ดูแลต่อไป (ไม่ต้องแก้)
  function showForceChangePw(){
  nav.innerHTML='';
  app.innerHTML=`
    <div style="max-width:400px;margin:80px auto;padding:2rem;background:#fff;border-radius:12px;">
      <h2 style="margin-bottom:1rem;">ตั้งรหัสผ่านใหม่</h2>
      <p style="margin-bottom:1.5rem;color:#666;">กรุณาตั้งรหัสผ่านใหม่ของคุณเอง (อย่างน้อย 6 ตัวอักษร)</p>
      <input id="new-pw" type="password" placeholder="รหัสผ่านใหม่" style="width:100%;padding:0.75rem;margin-bottom:0.75rem;border:1px solid #ddd;border-radius:8px;font-size:1rem;">
      <input id="new-pw2" type="password" placeholder="ยืนยันรหัสผ่านใหม่" style="width:100%;padding:0.75rem;margin-bottom:1rem;border:1px solid #ddd;border-radius:8px;font-size:1rem;">
      <button onclick="submitNewPw()" style="width:100%;padding:0.875rem;background:#C4612F;color:#fff;border:none;border-radius:999px;font-size:1rem;cursor:pointer;">บันทึกรหัสผ่าน</button>
    </div>
  `;
  ge('new-pw').focus();
}

async function submitNewPw(){
  const p1=ge('new-pw').value, p2=ge('new-pw2').value;
  if(p1.length<6)return banner('รหัสผ่านอย่างน้อย 6 ตัวอักษร',true);
  if(p1!==p2)return banner('รหัสผ่านไม่ตรงกัน',true);
  
  const s=DB.students.find(x=>x.id===SESSION.uid);
  if(!s)return banner('ไม่พบข้อมูล',true);
  
  banner('กำลังบันทึกรหัสผ่าน...');
  
  // 🔹 อัปเดตรหัสผ่านใน Supabase Auth
  const {error:authError} = await sb.auth.updateUser({password:p1});
  if(authError){
    return banner('เปลี่ยนรหัสไม่สำเร็จ: ' + authError.message, true);
  }
  
  // 🔹 ลบ temp_pw และ ปิด must_change
  const {error:dbError} = await sb.from('students').update({
    temp_pw: null,
    must_change: false
  }).eq('id', SESSION.uid);
  
  if(dbError){
    return banner('อัปเดต DB ไม่สำเร็จ: ' + dbError.message, true);
  }
  
  s.temp_pw = null;
  s.mustChange = false;
  save();
  
  banner('✅ เปลี่ยนรหัสผ่านสำเร็จ');
  setTimeout(studentDash, 1000);
}
