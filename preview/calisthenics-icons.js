/* Original user-supplied anatomical WebP illustrations. Stable exercise IDs unchanged. */
window.CALISTHENICS_ICON_FILES={
  "cali-01": "14_pompki_na_podwyzszeniu.webp",
  "cali-02": "12_pompki_klasyczne.webp",
  "cali-03": "11_pompki_diamentowe.webp",
  "cali-04": "15_pompki_pike.webp",
  "cali-05": "13_pompki_lucznicze.webp",
  "cali-06": "06_podciaganie_australijskie.webp",
  "cali-07": "10_podciaganie_z_guma.webp",
  "cali-08": "08_podciaganie_negatywne.webp",
  "cali-09": "07_podciaganie_nachwytem.webp",
  "cali-10": "09_podciaganie_podchwytem.webp",
  "cali-11": "02_dipy_na_poreczach.webp",
  "cali-12": "18_przysiady_z_masa_ciala.webp",
  "cali-13": "22_wykroki_w_tyl.webp",
  "cali-14": "16_przysiad_bulgarski.webp",
  "cali-15": "17_przysiad_pistol.webp",
  "cali-16": "05_most_biodrowy_jednonoz.webp",
  "cali-17": "03_hollow_body_hold.webp",
  "cali-18": "01_dead_bug.webp",
  "cali-19": "21_unoszenie_kolan.webp",
  "cali-20": "04_l_sit.webp",
  "cali-21": "20_stanie_na_rekach.webp",
  "cali-22": "19_scapular_pull_up.webp"
};
window.CALISTHENICS_ICON_SVGS=Object.fromEntries(Object.entries(window.CALISTHENICS_ICON_FILES).map(([id,file])=>[id,'<img src="./assets/calisthenics/'+file+'" alt="" loading="lazy" decoding="async">']));
// New entries use the approved R6 graphics directly, without duplicate image files.
for(let index=23;index<=52;index++){
 const id='cali-'+index;
 window.CALISTHENICS_ICON_SVGS[id]='<img src="./assets/graphics-r6/'+id+'.webp" alt="" loading="lazy" decoding="async">';
}

