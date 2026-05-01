import React, { useState, useMemo, useEffect } from "react";
import { ChevronDown, ChevronUp, Bus, Plane, MapPin, Bed, Lightbulb, Users, Shield, Tag, Sparkles, Calculator, BookOpen, Wallet, CalendarClock, Info, CheckCircle2 } from "lucide-react";

// === DATA ===
const RAW = [
  { Empresa:"Flecha", Destino:"San Clemente", Transporte:"Bus", Dias:2, Noches:1, Plan_Pago:"Pago de Contado en 5 cuotas", Cantidad_Cuotas:5, Inscripcion:85000, Primera_Cuota:85000, Cuota_Mensual:160000, Total_Final:650000, Liberados:"2 cada 10 pasajeros (a charlar)", Seguro:"Seguro de Caución incluido", Descuentos:"10% de descuento para hermanos que ya viajaron", Actividades:"Mundo Marino, Parque Acuático Poseidón, Hotel El Águila del Tuyú, Preencuentro Parque de la Costa", Vigencia:"Vigente hasta el 30 de abril de 2026" },
  { Empresa:"Flecha", Destino:"San Clemente", Transporte:"Bus", Dias:2, Noches:1, Plan_Pago:"Plan en 8 cuotas", Cantidad_Cuotas:8, Inscripcion:85000, Primera_Cuota:85000, Cuota_Mensual:86700, Total_Final:690200, Liberados:"2 cada 10 pasajeros", Seguro:"Seguro de Caución incluido", Descuentos:"10% para hermanos", Actividades:"Mundo Marino, Poseidón, Preencuentro Parque de la Costa", Vigencia:"Vigente hasta el 30 de abril de 2026" },
  { Empresa:"Flecha", Destino:"San Clemente", Transporte:"Bus", Dias:2, Noches:1, Plan_Pago:"Plan en 14 cuotas", Cantidad_Cuotas:14, Inscripcion:85000, Primera_Cuota:85000, Cuota_Mensual:46700, Total_Final:730400, Liberados:"2 cada 10 pasajeros", Seguro:"Seguro de Caución incluido", Descuentos:"10% para hermanos", Actividades:"Mundo Marino, Poseidón, Preencuentro", Vigencia:"Vigente hasta el 30 de abril de 2026" },
  { Empresa:"Flecha", Destino:"San Clemente", Transporte:"Bus", Dias:2, Noches:1, Plan_Pago:"Plan en 20 cuotas", Cantidad_Cuotas:20, Inscripcion:85000, Primera_Cuota:85000, Cuota_Mensual:36700, Total_Final:830600, Liberados:"2 cada 10 pasajeros", Seguro:"Seguro de Caución incluido", Descuentos:"10% para hermanos", Actividades:"Mundo Marino, Poseidón, Preencuentro", Vigencia:"Vigente hasta el 30 de abril de 2026" },
  { Empresa:"Flecha", Destino:"San Clemente", Transporte:"Bus", Dias:3, Noches:2, Plan_Pago:"Pago de Contado en 5 cuotas", Cantidad_Cuotas:5, Inscripcion:85000, Primera_Cuota:85000, Cuota_Mensual:236700, Total_Final:880100, Liberados:"2 cada 10 pasajeros", Seguro:"Seguro de Caución incluido", Descuentos:"10% para hermanos", Actividades:"Mundo Marino, Poseidón, Fiesta Bienvenida, Fiesta Argentina, Cena Gala con Alfombra Roja, Green Park", Vigencia:"Vigente hasta el 30 de abril de 2026" },
  { Empresa:"Flecha", Destino:"San Clemente", Transporte:"Bus", Dias:3, Noches:2, Plan_Pago:"Plan en 8 cuotas", Cantidad_Cuotas:8, Inscripcion:85000, Primera_Cuota:85000, Cuota_Mensual:126700, Total_Final:930200, Liberados:"2 cada 10 pasajeros", Seguro:"Seguro de Caución incluido", Descuentos:"10% para hermanos", Actividades:"Mundo Marino, Poseidón, Green Park, Fiestas", Vigencia:"Vigente hasta el 30 de abril de 2026" },
  { Empresa:"Flecha", Destino:"San Clemente", Transporte:"Bus", Dias:3, Noches:2, Plan_Pago:"Plan en 14 cuotas", Cantidad_Cuotas:14, Inscripcion:85000, Primera_Cuota:85000, Cuota_Mensual:67500, Total_Final:980000, Liberados:"2 cada 10 pasajeros", Seguro:"Seguro de Caución incluido", Descuentos:"10% para hermanos", Actividades:"Mundo Marino, Poseidón, Green Park", Vigencia:"Vigente hasta el 30 de abril de 2026" },
  { Empresa:"Flecha", Destino:"San Clemente", Transporte:"Bus", Dias:3, Noches:2, Plan_Pago:"Plan en 20 cuotas", Cantidad_Cuotas:20, Inscripcion:85000, Primera_Cuota:85000, Cuota_Mensual:51700, Total_Final:1100600, Liberados:"2 cada 10 pasajeros", Seguro:"Seguro de Caución incluido", Descuentos:"10% para hermanos", Actividades:"Mundo Marino, Poseidón, Green Park", Vigencia:"Vigente hasta el 30 de abril de 2026" },
  { Empresa:"Flecha", Destino:"San Clemente", Transporte:"Bus", Dias:4, Noches:3, Plan_Pago:"Plan en 5 cuotas", Cantidad_Cuotas:5, Inscripcion:85000, Primera_Cuota:85000, Cuota_Mensual:273400, Total_Final:990000, Liberados:"2 cada 10 pasajeros", Seguro:"Seguro de Caución incluido", Descuentos:"10% para hermanos", Actividades:"Mundo Marino, Poseidón, Green Park, Fiestas, Tarde Playa", Vigencia:"Vigente hasta el 30 de abril de 2026" },
  { Empresa:"Flecha", Destino:"San Clemente", Transporte:"Bus", Dias:4, Noches:3, Plan_Pago:"Plan en 8 cuotas", Cantidad_Cuotas:8, Inscripcion:85000, Primera_Cuota:85000, Cuota_Mensual:147500, Total_Final:1055000, Liberados:"2 cada 10 pasajeros", Seguro:"Seguro de Caución incluido", Descuentos:"10% para hermanos", Actividades:"Mundo Marino, Poseidón, Green Park", Vigencia:"Vigente hasta el 30 de abril de 2026" },
  { Empresa:"Flecha", Destino:"San Clemente", Transporte:"Bus", Dias:4, Noches:3, Plan_Pago:"Plan en 14 cuotas", Cantidad_Cuotas:14, Inscripcion:85000, Primera_Cuota:85000, Cuota_Mensual:77500, Total_Final:1100000, Liberados:"2 cada 10 pasajeros", Seguro:"Seguro de Caución incluido", Descuentos:"10% para hermanos", Actividades:"Mundo Marino, Poseidón, Green Park", Vigencia:"Vigente hasta el 30 de abril de 2026" },
  { Empresa:"Flecha", Destino:"San Clemente", Transporte:"Bus", Dias:4, Noches:3, Plan_Pago:"Plan en 20 cuotas", Cantidad_Cuotas:20, Inscripcion:85000, Primera_Cuota:85000, Cuota_Mensual:60000, Total_Final:1250000, Liberados:"2 cada 10 pasajeros", Seguro:"Seguro de Caución incluido", Descuentos:"10% para hermanos", Actividades:"Mundo Marino, Poseidón, Green Park", Vigencia:"Vigente hasta el 30 de abril de 2026" },
  { Empresa:"Flecha", Destino:"Córdoba", Transporte:"Avión", Dias:5, Noches:4, Plan_Pago:"Pago de Contado (un solo pago)", Cantidad_Cuotas:1, Inscripcion:240000, Anticipo_Saldo:1210000, Total_Final:1450000, Liberados:"2 cada 10 pagos completos", Seguro:"Seguro de Caución incluido", Descuentos:"10% para hermanos. Bonificación de $200.000 si se contrata antes del 15 de abril", Actividades:"Parques temáticos, Kit regalos, Fiesta egresados, Foto lámina, sorteos (tiene 1 actividad menos de día y 1 menos de noche que la versión de 6 días)", Vigencia:"Versión en avión. Hay opción en bus por $200.000 menos" },
  { Empresa:"Flecha", Destino:"Córdoba", Transporte:"Avión", Dias:5, Noches:4, Plan_Pago:"Plan en 5 cuotas", Cantidad_Cuotas:5, Inscripcion:120000, Primera_Cuota:120000, Cuota_Mensual:453333, Total_Final:1600000, Liberados:"2 cada 10 pagos completos", Seguro:"Seguro de Caución incluido", Descuentos:"10% para hermanos", Actividades:"Parques temáticos, Kit regalos, Fiestas (tiene 1 actividad menos de día y 1 menos de noche que la versión de 6 días)", Vigencia:"Versión en avión. Hay opción en bus por $200.000 menos" },
  { Empresa:"Flecha", Destino:"Córdoba", Transporte:"Avión", Dias:5, Noches:4, Plan_Pago:"Plan en 8 cuotas", Cantidad_Cuotas:8, Inscripcion:120000, Primera_Cuota:120000, Cuota_Mensual:243333, Total_Final:1700000, Liberados:"2 cada 10 pagos completos", Seguro:"Seguro de Caución incluido", Descuentos:"10% para hermanos", Actividades:"Parques temáticos, Kit, Fiestas (tiene 1 actividad menos de día y 1 menos de noche que la versión de 6 días)", Vigencia:"Versión en avión. Hay opción en bus por $200.000 menos" },
  { Empresa:"Flecha", Destino:"Córdoba", Transporte:"Avión", Dias:5, Noches:4, Plan_Pago:"Plan en 14 cuotas", Cantidad_Cuotas:14, Inscripcion:120000, Primera_Cuota:120000, Cuota_Mensual:134166, Total_Final:1850000, Liberados:"2 cada 10 pagos completos", Seguro:"Seguro de Caución incluido", Descuentos:"10% para hermanos", Actividades:"Parques temáticos, Kit, Fiestas (tiene 1 actividad menos de día y 1 menos de noche que la versión de 6 días)", Vigencia:"Versión en avión. Hay opción en bus por $200.000 menos" },
  { Empresa:"Flecha", Destino:"Córdoba", Transporte:"Avión", Dias:5, Noches:4, Plan_Pago:"Plan en 20 cuotas", Cantidad_Cuotas:20, Inscripcion:120000, Primera_Cuota:120000, Cuota_Mensual:97777, Total_Final:2000000, Liberados:"2 cada 10 pagos completos", Seguro:"Seguro de Caución incluido", Descuentos:"10% para hermanos", Actividades:"Parques temáticos, Kit, Fiestas (tiene 1 actividad menos de día y 1 menos de noche que la versión de 6 días)", Vigencia:"Versión en avión. Hay opción en bus por $200.000 menos" },
  { Empresa:"Flecha", Destino:"Córdoba", Transporte:"Avión", Dias:6, Noches:5, Plan_Pago:"Pago de Contado (un solo pago)", Cantidad_Cuotas:1, Inscripcion:240000, Anticipo_Saldo:1340000, Total_Final:1580000, Liberados:"2 cada 10 pagos completos", Seguro:"Seguro de Caución incluido", Descuentos:"10% para hermanos. Bonificación de $200.000 si se contrata antes del 15 de abril", Actividades:"Parques temáticos, Kit, Fiestas, Sorteos", Vigencia:"Versión en avión. Hay opción en bus por $200.000 menos" },
  { Empresa:"Flecha", Destino:"Córdoba", Transporte:"Avión", Dias:6, Noches:5, Plan_Pago:"Plan en 5 cuotas", Cantidad_Cuotas:5, Inscripcion:120000, Primera_Cuota:120000, Cuota_Mensual:496666, Total_Final:1730000, Liberados:"2 cada 10 pagos completos", Seguro:"Seguro de Caución incluido", Descuentos:"10% para hermanos", Actividades:"Parques temáticos, Kit, Fiestas", Vigencia:"Versión en avión. Hay opción en bus por $200.000 menos" },
  { Empresa:"Flecha", Destino:"Córdoba", Transporte:"Avión", Dias:6, Noches:5, Plan_Pago:"Plan en 8 cuotas", Cantidad_Cuotas:8, Inscripcion:120000, Primera_Cuota:120000, Cuota_Mensual:268333, Total_Final:1850000, Liberados:"2 cada 10 pagos completos", Seguro:"Seguro de Caución incluido", Descuentos:"10% para hermanos", Actividades:"Parques temáticos, Kit, Fiestas", Vigencia:"Versión en avión. Hay opción en bus por $200.000 menos" },
  { Empresa:"Flecha", Destino:"Córdoba", Transporte:"Avión", Dias:6, Noches:5, Plan_Pago:"Plan en 14 cuotas", Cantidad_Cuotas:14, Inscripcion:120000, Primera_Cuota:120000, Cuota_Mensual:146666, Total_Final:2000000, Liberados:"2 cada 10 pagos completos", Seguro:"Seguro de Caución incluido", Descuentos:"10% para hermanos", Actividades:"Parques temáticos, Kit, Fiestas", Vigencia:"Versión en avión. Hay opción en bus por $200.000 menos" },
  { Empresa:"Flecha", Destino:"Córdoba", Transporte:"Avión", Dias:6, Noches:5, Plan_Pago:"Plan en 20 cuotas", Cantidad_Cuotas:20, Inscripcion:120000, Primera_Cuota:120000, Cuota_Mensual:106444, Total_Final:2156000, Liberados:"2 cada 10 pagos completos", Seguro:"Seguro de Caución incluido", Descuentos:"10% para hermanos", Actividades:"Parques temáticos, Kit, Fiestas", Vigencia:"Versión en avión. Hay opción en bus por $200.000 menos" },
  // === FLECHA CÓRDOBA EN BUS (versiones equivalentes con $200.000 de descuento) ===
  { Empresa:"Flecha", Destino:"Córdoba (en Bus)", Transporte:"Bus", Dias:5, Noches:4, Plan_Pago:"Pago de Contado (un solo pago)", Cantidad_Cuotas:1, Inscripcion:240000, Anticipo_Saldo:1010000, Total_Final:1250000, Liberados:"2 cada 10 pagos completos", Seguro:"Seguro de Caución incluido", Descuentos:"10% para hermanos. Bonificación de $200.000 si se contrata antes del 15 de abril", Actividades:"Parques temáticos, Kit de regalos, Fiesta de egresados, Foto lámina, Sorteos (tiene 1 actividad menos de día y 1 menos de noche que la versión de 6 días)", Vigencia:"Versión en bus. Sale $200.000 menos que la opción en avión" },
  { Empresa:"Flecha", Destino:"Córdoba (en Bus)", Transporte:"Bus", Dias:5, Noches:4, Plan_Pago:"Plan en 5 cuotas", Cantidad_Cuotas:5, Inscripcion:120000, Primera_Cuota:120000, Cuota_Mensual:386666, Total_Final:1400000, Liberados:"2 cada 10 pagos completos", Seguro:"Seguro de Caución incluido", Descuentos:"10% para hermanos", Actividades:"Parques temáticos, Kit de regalos, Fiestas (tiene 1 actividad menos de día y 1 menos de noche que la versión de 6 días)", Vigencia:"Versión en bus" },
  { Empresa:"Flecha", Destino:"Córdoba (en Bus)", Transporte:"Bus", Dias:5, Noches:4, Plan_Pago:"Plan en 8 cuotas", Cantidad_Cuotas:8, Inscripcion:120000, Primera_Cuota:120000, Cuota_Mensual:210000, Total_Final:1500000, Liberados:"2 cada 10 pagos completos", Seguro:"Seguro de Caución incluido", Descuentos:"10% para hermanos", Actividades:"Parques temáticos, Kit, Fiestas (tiene 1 actividad menos de día y 1 menos de noche que la versión de 6 días)", Vigencia:"Versión en bus" },
  { Empresa:"Flecha", Destino:"Córdoba (en Bus)", Transporte:"Bus", Dias:5, Noches:4, Plan_Pago:"Plan en 14 cuotas", Cantidad_Cuotas:14, Inscripcion:120000, Primera_Cuota:120000, Cuota_Mensual:117500, Total_Final:1650000, Liberados:"2 cada 10 pagos completos", Seguro:"Seguro de Caución incluido", Descuentos:"10% para hermanos", Actividades:"Parques temáticos, Kit, Fiestas (tiene 1 actividad menos de día y 1 menos de noche que la versión de 6 días)", Vigencia:"Versión en bus" },
  { Empresa:"Flecha", Destino:"Córdoba (en Bus)", Transporte:"Bus", Dias:5, Noches:4, Plan_Pago:"Plan en 20 cuotas", Cantidad_Cuotas:20, Inscripcion:120000, Primera_Cuota:120000, Cuota_Mensual:86666, Total_Final:1800000, Liberados:"2 cada 10 pagos completos", Seguro:"Seguro de Caución incluido", Descuentos:"10% para hermanos", Actividades:"Parques temáticos, Kit, Fiestas (tiene 1 actividad menos de día y 1 menos de noche que la versión de 6 días)", Vigencia:"Versión en bus" },
  { Empresa:"Flecha", Destino:"Córdoba (en Bus)", Transporte:"Bus", Dias:6, Noches:5, Plan_Pago:"Pago de Contado (un solo pago)", Cantidad_Cuotas:1, Inscripcion:240000, Anticipo_Saldo:1140000, Total_Final:1380000, Liberados:"2 cada 10 pagos completos", Seguro:"Seguro de Caución incluido", Descuentos:"10% para hermanos. Bonificación de $200.000 si se contrata antes del 15 de abril", Actividades:"Parques temáticos, Kit, Fiestas, Sorteos", Vigencia:"Versión en bus. Sale $200.000 menos que la opción en avión" },
  { Empresa:"Flecha", Destino:"Córdoba (en Bus)", Transporte:"Bus", Dias:6, Noches:5, Plan_Pago:"Plan en 5 cuotas", Cantidad_Cuotas:5, Inscripcion:120000, Primera_Cuota:120000, Cuota_Mensual:430000, Total_Final:1530000, Liberados:"2 cada 10 pagos completos", Seguro:"Seguro de Caución incluido", Descuentos:"10% para hermanos", Actividades:"Parques temáticos, Kit, Fiestas", Vigencia:"Versión en bus" },
  { Empresa:"Flecha", Destino:"Córdoba (en Bus)", Transporte:"Bus", Dias:6, Noches:5, Plan_Pago:"Plan en 8 cuotas", Cantidad_Cuotas:8, Inscripcion:120000, Primera_Cuota:120000, Cuota_Mensual:235000, Total_Final:1650000, Liberados:"2 cada 10 pagos completos", Seguro:"Seguro de Caución incluido", Descuentos:"10% para hermanos", Actividades:"Parques temáticos, Kit, Fiestas", Vigencia:"Versión en bus" },
  { Empresa:"Flecha", Destino:"Córdoba (en Bus)", Transporte:"Bus", Dias:6, Noches:5, Plan_Pago:"Plan en 14 cuotas", Cantidad_Cuotas:14, Inscripcion:120000, Primera_Cuota:120000, Cuota_Mensual:130000, Total_Final:1800000, Liberados:"2 cada 10 pagos completos", Seguro:"Seguro de Caución incluido", Descuentos:"10% para hermanos", Actividades:"Parques temáticos, Kit, Fiestas", Vigencia:"Versión en bus" },
  { Empresa:"Flecha", Destino:"Córdoba (en Bus)", Transporte:"Bus", Dias:6, Noches:5, Plan_Pago:"Plan en 20 cuotas", Cantidad_Cuotas:20, Inscripcion:120000, Primera_Cuota:120000, Cuota_Mensual:95333, Total_Final:1956000, Liberados:"2 cada 10 pagos completos", Seguro:"Seguro de Caución incluido", Descuentos:"10% para hermanos", Actividades:"Parques temáticos, Kit, Fiestas", Vigencia:"Versión en bus" },
  { Empresa:"Super Tour", Destino:"Villa Carlos Paz / Córdoba", Transporte:"Avión", Dias:6, Noches:5, Plan_Pago:"Pago de Contado en 2 cuotas", Cantidad_Cuotas:2, Inscripcion:160000, Anticipo_Saldo:1530000, Total_Final:1690000, Liberados:"1 cada 5 chicos. 1 acompañante adulto cada 10 chicos. Mellizos pagan 2x1. Bonificación con CUD", Seguro:"Seguro de caución individual + tasas e impuestos aéreos", Descuentos:"Hermanos a consultar", Actividades:"Bienvenida, H2O Play, Splash Fun, Mountain Park, Duelo Vaqueros, Go Kart, Super Day, City Tour, Fábricas Regionales, Super Match, Super Fest, Argentina, Baile Graduación, Sunset Color Party, Pool Party, Red Carpet, Magic, Night, Mansión Zombie, Infinito Water Park", Vigencia:"Promoción Mundial vigente hasta el 25 de abril" },
  { Empresa:"Super Tour", Destino:"Villa Carlos Paz / Córdoba", Transporte:"Avión", Dias:6, Noches:5, Plan_Pago:"Plan en 4 cuotas", Cantidad_Cuotas:4, Cuota_Mensual:470025, Total_Final:1880100, Liberados:"1 cada 5 chicos. Mellizos 2x1. Bonificación con CUD", Seguro:"Seguro de caución individual", Descuentos:"Hermanos a consultar", Actividades:"Parques temáticos, Fiestas, Sunset, Noches", Vigencia:"Promoción Mundial hasta el 25 de abril" },
  { Empresa:"Super Tour", Destino:"Villa Carlos Paz / Córdoba", Transporte:"Avión", Dias:6, Noches:5, Plan_Pago:"Plan en 12 cuotas", Cantidad_Cuotas:12, Cuota_Mensual:174167, Total_Final:2090000, Liberados:"1 cada 5 chicos. Mellizos 2x1. Bonificación con CUD", Seguro:"Seguro de caución individual", Descuentos:"Hermanos a consultar", Actividades:"Parques temáticos, Fiestas, Sunset", Vigencia:"Promoción Mundial hasta el 25 de abril" },
  { Empresa:"Super Tour", Destino:"Villa Carlos Paz / Córdoba", Transporte:"Avión", Dias:6, Noches:5, Plan_Pago:"Plan en 19 cuotas", Cantidad_Cuotas:19, Cuota_Mensual:122137, Total_Final:2320600, Liberados:"1 cada 5 chicos. Mellizos 2x1. Bonificación con CUD", Seguro:"Seguro de caución individual", Descuentos:"Hermanos a consultar", Actividades:"Parques temáticos, Fiestas, Sunset", Vigencia:"Promoción Mundial hasta el 25 de abril" },
  { Empresa:"Super Tour", Destino:"Villa Carlos Paz / Córdoba", Transporte:"Avión", Dias:5, Noches:4, Plan_Pago:"Pago de Contado (un solo pago)", Cantidad_Cuotas:1, Inscripcion:145000, Anticipo_Saldo:1375000, Total_Final:1520000, Liberados:"1 cada 5 chicos. Mellizos 2x1. Bonificación con CUD", Seguro:"Seguro de caución individual", Descuentos:"Hermanos a consultar", Actividades:"Bienvenida, H2O Play, Splash Fun, Mountain Park, Go Kart, Super Day, City Tour, Fábricas, Super Fest, Argentina, Baile, Sunset, Pool Party, Red Carpet", Vigencia:"Promoción Mundial hasta el 25 de abril" },
  { Empresa:"Super Tour", Destino:"Villa Carlos Paz / Córdoba", Transporte:"Avión", Dias:5, Noches:4, Plan_Pago:"Plan en 4 cuotas", Cantidad_Cuotas:4, Cuota_Mensual:422500, Total_Final:1690000, Liberados:"1 cada 5 chicos. Mellizos 2x1. Bonificación con CUD", Seguro:"Seguro de caución individual", Descuentos:"Hermanos a consultar", Actividades:"Parques temáticos, Fiestas", Vigencia:"Promoción Mundial hasta el 25 de abril" },
  { Empresa:"Super Tour", Destino:"Villa Carlos Paz / Córdoba", Transporte:"Avión", Dias:5, Noches:4, Plan_Pago:"Plan en 12 cuotas", Cantidad_Cuotas:12, Cuota_Mensual:156667, Total_Final:1880000, Liberados:"1 cada 5 chicos. Mellizos 2x1. Bonificación con CUD", Seguro:"Seguro de caución individual", Descuentos:"Hermanos a consultar", Actividades:"Parques temáticos, Fiestas", Vigencia:"Promoción Mundial hasta el 25 de abril" },
  { Empresa:"Super Tour", Destino:"Villa Carlos Paz / Córdoba", Transporte:"Avión", Dias:5, Noches:4, Plan_Pago:"Plan en 18 cuotas", Cantidad_Cuotas:18, Cuota_Mensual:116111, Total_Final:2090000, Liberados:"1 cada 5 chicos. Mellizos 2x1. Bonificación con CUD", Seguro:"Seguro de caución individual", Descuentos:"Hermanos a consultar", Actividades:"Parques temáticos, Fiestas", Vigencia:"Promoción Mundial hasta el 25 de abril" },
  { Empresa:"Super Tour", Destino:"Mar del Plata", Transporte:"Bus", Dias:4, Noches:3, Plan_Pago:"Pago de Contado (un solo pago)", Cantidad_Cuotas:1, Inscripcion:105000, Total_Final:1090500, Liberados:"1 liberado o bonificación cada 10 pagos completos", Seguro:"Seguro de caución 100% incluido", Descuentos:"Hermanos a consultar", Actividades:"Bienvenida, Splash Fun, Jump Park, Parque Acuático, Game Laser, Super Day, Sunset Pool Party, Color Party, Red Carpet Photo Show, Despedida, Super Fest, Super Fiesta Argentina, Baile Graduación", Vigencia:"Cuota inicial en abril 2026. Última cuota como máximo en octubre 2027" },
  { Empresa:"Super Tour", Destino:"Mar del Plata", Transporte:"Bus", Dias:4, Noches:3, Plan_Pago:"Plan en 3 cuotas", Cantidad_Cuotas:3, Inscripcion:105000, Cuota_Mensual:328500, Total_Final:1090500, Liberados:"1 cada 10 pagos completos", Seguro:"Seguro de caución 100% incluido", Descuentos:"Hermanos a consultar", Actividades:"Splash Fun, Jump Park, Parque Acuático, Game Laser", Vigencia:"Última cuota como máximo en octubre 2027" },
  { Empresa:"Super Tour", Destino:"Mar del Plata", Transporte:"Bus", Dias:4, Noches:3, Plan_Pago:"Plan en 10 cuotas", Cantidad_Cuotas:10, Inscripcion:115000, Cuota_Mensual:109500, Total_Final:1210000, Liberados:"1 cada 10 pagos completos", Seguro:"Seguro de caución 100% incluido", Descuentos:"Hermanos a consultar", Actividades:"Splash Fun, Jump Park, Parque Acuático, Game Laser", Vigencia:"Última cuota como máximo en octubre 2027" },
  { Empresa:"Super Tour", Destino:"Mar del Plata", Transporte:"Bus", Dias:4, Noches:3, Plan_Pago:"Plan en 17 cuotas", Cantidad_Cuotas:17, Inscripcion:130000, Cuota_Mensual:68800, Total_Final:1299600, Liberados:"1 cada 10 pagos completos", Seguro:"Seguro de caución 100% incluido", Descuentos:"Hermanos a consultar", Actividades:"Splash Fun, Jump Park, Parque Acuático, Game Laser", Vigencia:"Última cuota como máximo en octubre 2027" },
  { Empresa:"Super Tour", Destino:"Mar del Plata", Transporte:"Bus", Dias:4, Noches:3, Plan_Pago:"Plan en 18 cuotas", Cantidad_Cuotas:18, Inscripcion:130000, Cuota_Mensual:65000, Total_Final:1300000, Liberados:"1 cada 10 pagos completos", Seguro:"Seguro de caución 100% incluido", Descuentos:"Hermanos a consultar", Actividades:"Splash Fun, Jump Park, Parque Acuático, Game Laser", Vigencia:"Última cuota como máximo en octubre 2027" },
  { Empresa:"Super Tour", Destino:"Mar del Plata", Transporte:"Bus", Dias:3, Noches:2, Plan_Pago:"Pago de Contado (un solo pago)", Cantidad_Cuotas:1, Inscripcion:90000, Total_Final:910500, Liberados:"1 cada 10 pagos completos", Seguro:"Seguro de caución 100% incluido", Descuentos:"Hermanos a consultar", Actividades:"Bienvenida, Jump Park, Splash Fun, Parque Acuático, Sunset Pool Party, Color Party, Super Fest, Baile Graduación, Despedida", Vigencia:"Promoción Mundial vigente hasta el 25 de abril" },
  { Empresa:"Super Tour", Destino:"Mar del Plata", Transporte:"Bus", Dias:3, Noches:2, Plan_Pago:"Plan en 3 cuotas", Cantidad_Cuotas:3, Inscripcion:90000, Cuota_Mensual:273500, Total_Final:910500, Liberados:"1 cada 10 pagos completos", Seguro:"Seguro de caución 100% incluido", Descuentos:"Hermanos a consultar", Actividades:"Jump Park, Splash Fun, Parque Acuático, Fiestas", Vigencia:"Promoción del 25 de abril" },
  { Empresa:"Super Tour", Destino:"Mar del Plata", Transporte:"Bus", Dias:3, Noches:2, Plan_Pago:"Plan en 10 cuotas", Cantidad_Cuotas:10, Inscripcion:95000, Cuota_Mensual:90500, Total_Final:1000000, Liberados:"1 cada 10 pagos completos", Seguro:"Seguro de caución 100% incluido", Descuentos:"Hermanos a consultar", Actividades:"Jump Park, Splash Fun, Parque Acuático, Fiestas", Vigencia:"Promoción del 25 de abril" },
  { Empresa:"Super Tour", Destino:"Mar del Plata", Transporte:"Bus", Dias:3, Noches:2, Plan_Pago:"Plan en 17 cuotas", Cantidad_Cuotas:17, Inscripcion:105000, Cuota_Mensual:58500, Total_Final:1099500, Liberados:"1 cada 10 pagos completos", Seguro:"Seguro de caución 100% incluido", Descuentos:"Hermanos a consultar", Actividades:"Jump Park, Splash Fun, Parque Acuático, Fiestas", Vigencia:"Promoción del 25 de abril" },
  { Empresa:"Super Tour", Destino:"Mar del Plata", Transporte:"Bus", Dias:3, Noches:2, Plan_Pago:"Plan en 18 cuotas", Cantidad_Cuotas:18, Inscripcion:105000, Cuota_Mensual:55300, Total_Final:1100400, Liberados:"1 cada 10 pagos completos", Seguro:"Seguro de caución 100% incluido", Descuentos:"Hermanos a consultar", Actividades:"Jump Park, Splash Fun, Parque Acuático, Fiestas", Vigencia:"Promoción del 25 de abril" },
  { Empresa:"Super Tour", Destino:"Dolores (Parque Termal)", Transporte:"Bus", Dias:3, Noches:2, Plan_Pago:"Pago de Contado (un solo pago)", Cantidad_Cuotas:1, Inscripcion:150000, Anticipo_Saldo:685000, Total_Final:760000, Liberados:"Liberados niños y acompañantes", Seguro:"Seguro de caución 100% incluido", Descuentos:"Hermanos a consultar", Actividades:"Bienvenida, Splash Fun, Game Laser, Parque Aéreo, Super Laberinto, Bubble Football, Laberinto Inflable, Super Big Ball, Super Golazo, Fogón Mágico, Sunset Pool Party, Sunset Color Party, Super Fest, Baile Graduación, Despedida", Vigencia:"Hotel Days Inn" },
  { Empresa:"Super Tour", Destino:"Dolores (Parque Termal)", Transporte:"Bus", Dias:3, Noches:2, Plan_Pago:"Plan en 4 cuotas", Cantidad_Cuotas:4, Inscripcion:75000, Anticipo_Saldo:228500, Cuota_Mensual:114250, Total_Final:760500, Liberados:"Liberados niños y acompañantes", Seguro:"Seguro de caución 100% incluido", Descuentos:"Hermanos a consultar", Actividades:"Splash Fun, Game Laser, Parque Aéreo, Super Laberinto, Fiestas", Vigencia:"Hotel Days Inn" },
  { Empresa:"Super Tour", Destino:"Dolores (Parque Termal)", Transporte:"Bus", Dias:3, Noches:2, Plan_Pago:"Plan en 12 cuotas", Cantidad_Cuotas:12, Inscripcion:80000, Anticipo_Saldo:77000, Cuota_Mensual:57750, Total_Final:850000, Liberados:"Liberados niños y acompañantes", Seguro:"Seguro de caución 100% incluido", Descuentos:"Hermanos a consultar", Actividades:"Splash Fun, Game Laser, Parque Aéreo, Fiestas", Vigencia:"Hotel Days Inn" },
  { Empresa:"Super Tour", Destino:"Dolores (Parque Termal)", Transporte:"Bus", Dias:3, Noches:2, Plan_Pago:"Plan en 19 cuotas", Cantidad_Cuotas:19, Inscripcion:90000, Anticipo_Saldo:50083, Cuota_Mensual:42138, Total_Final:940700, Liberados:"Liberados niños y acompañantes", Seguro:"Seguro de caución 100% incluido", Descuentos:"Hermanos a consultar", Actividades:"Splash Fun, Game Laser, Parque Aéreo, Fiestas", Vigencia:"Hotel Days Inn" },
  { Empresa:"Recrear", Destino:"Tandil", Transporte:"Bus", Dias:4, Noches:3, Plan_Pago:"Plan accesible (a coordinar)", Cantidad_Cuotas:null, Total_Final:1000000, Liberados:"Abierto a sumar más. Con 20 viajantes hay aproximadamente 6 liberados", Seguro:"Seguro del hotel incluido", Descuentos:"Estadía gratis para 4 personas en otro momento más rifas", Actividades:"Treeland Parque Multiaventuras, Bienvenida recreativa, Carnaval Pinturas, Fogón, Cocina Rústica, Tirolesa, Toboganes, Pool Party, Trip Circuit, Baile Egresados", Vigencia:"Empresa con trayectoria" },
  { Empresa:"Lake Travel", Destino:"Cariló", Transporte:"Bus", Dias:5, Noches:4, Plan_Pago:"Cuota Cero (un solo pago) con 15% de descuento", Cantidad_Cuotas:1, Reserva:50000, Inscripcion:50000, Anticipo_Saldo:892500, Total_Final:992500, Liberados:"A consultar", Seguro:"A consultar", Descuentos:"15% de descuento al contado. 10% en Plan Corto", Actividades:"Salida Mundo Lake, Fiesta Bienvenida, Glow Party, Pool Party, Pijama Party, Lake Park, Beach Day, Sunset Beach, We Color, Bizarra Fest, Water War, Natural Experience Sandboard, Lake Awards Noche de Gala, Regionales", Vigencia:"-" },
  { Empresa:"Lake Travel", Destino:"Cariló", Transporte:"Bus", Dias:5, Noches:4, Plan_Pago:"Plan Corto en 6 pagos con 10% de descuento", Cantidad_Cuotas:6, Reserva:50000, Inscripcion:50000, Cuota_Mensual:157500, Total_Final:1045000, Liberados:"A consultar", Seguro:"A consultar", Descuentos:"10% de descuento", Actividades:"Mundo Lake, Glow Party, Pool Party, Pijama Party, Lake Park, Beach Day, We Color, Bizarra Fest, Water War, Sandboard, Lake Awards", Vigencia:"-" },
  { Empresa:"Lake Travel", Destino:"Cariló", Transporte:"Bus", Dias:5, Noches:4, Plan_Pago:"Plan Extendido en 18 pagos", Cantidad_Cuotas:18, Reserva:50000, Inscripcion:50000, Cuota_Mensual:58333, Total_Final:1150000, Liberados:"A consultar", Seguro:"Tasa 0%", Descuentos:"A consultar", Actividades:"Mundo Lake, Fiestas, Pool Party, Lake Park, Beach Day, Bizarra Fest, Water War, Sandboard, Lake Awards", Vigencia:"-" },
  { Empresa:"Lake Travel", Destino:"Cariló", Transporte:"Bus", Dias:5, Noches:4, Plan_Pago:"Plan Extendido en 12 pagos", Cantidad_Cuotas:12, Reserva:50000, Inscripcion:50000, Cuota_Mensual:87500, Total_Final:1150000, Liberados:"A consultar", Seguro:"Tasa 0%", Descuentos:"A consultar", Actividades:"Mundo Lake, Fiestas, Pool Party, Lake Park, Beach Day", Vigencia:"-" },
  { Empresa:"Lake Travel", Destino:"Cariló", Transporte:"Bus", Dias:4, Noches:3, Plan_Pago:"Cuota Cero (un solo pago) con 15% de descuento", Cantidad_Cuotas:1, Reserva:50000, Inscripcion:50000, Anticipo_Saldo:756500, Total_Final:856500, Liberados:"A consultar", Seguro:"A consultar", Descuentos:"15% de descuento al contado", Actividades:"Mundo Lake, Fiesta Bienvenida, Glow Party, Sunset Beach, We Color, Lake Park, Bizarra Fest, Water War, Sandboard, Lake Awards Noche Gala, Regionales", Vigencia:"-" },
  { Empresa:"Lake Travel", Destino:"Cariló", Transporte:"Bus", Dias:4, Noches:3, Plan_Pago:"Plan Corto en 6 pagos con 10% de descuento", Cantidad_Cuotas:6, Reserva:50000, Inscripcion:50000, Cuota_Mensual:133500, Total_Final:901000, Liberados:"A consultar", Seguro:"A consultar", Descuentos:"10% de descuento", Actividades:"Mundo Lake, Fiestas, Lake Park, Bizarra Fest, Water War", Vigencia:"-" },
  { Empresa:"Lake Travel", Destino:"Cariló", Transporte:"Bus", Dias:4, Noches:3, Plan_Pago:"Plan Extendido en 18 pagos", Cantidad_Cuotas:18, Reserva:50000, Inscripcion:50000, Cuota_Mensual:49444, Total_Final:990000, Liberados:"A consultar", Seguro:"Tasa 0%", Descuentos:"A consultar", Actividades:"Mundo Lake, Fiestas, Lake Park, Bizarra Fest", Vigencia:"-" },
  { Empresa:"Lake Travel", Destino:"Cariló", Transporte:"Bus", Dias:4, Noches:3, Plan_Pago:"Plan Extendido en 12 pagos", Cantidad_Cuotas:12, Reserva:50000, Inscripcion:50000, Cuota_Mensual:74167, Total_Final:990000, Liberados:"A consultar", Seguro:"Tasa 0%", Descuentos:"A consultar", Actividades:"Mundo Lake, Fiestas, Lake Park", Vigencia:"-" },
  { Empresa:"Serrano", Destino:"San Pedro", Transporte:"Bus", Dias:null, Noches:null, Plan_Pago:"Plan variable (a coordinar)", Cantidad_Cuotas:null, Total_Final:450000, Liberados:"A consultar", Seguro:"A consultar", Descuentos:"A consultar", Actividades:"El Fuerte de Obligado (turismo aventura, palestra, péndulo, rappel, tirolesa, toboganes), Beach Day con Canotaje, Complejo Las Amalias, app Viaxlab seguimiento", Vigencia:"Reunión el 8 de mayo de 2026. Empresa conocida" },
  { Empresa:"Serrano", Destino:"Córdoba", Transporte:"Bus", Dias:null, Noches:null, Plan_Pago:"Plan variable (a coordinar)", Cantidad_Cuotas:null, Liberados:"A consultar", Seguro:"A consultar", Descuentos:"A consultar", Actividades:"Consultar", Vigencia:"Reunión el 8 de mayo de 2026" },
  { Empresa:"Puerto Aventura", Destino:"Chascomús", Transporte:"Bus", Dias:3, Noches:2, Plan_Pago:"Plan en 3 cuotas", Cantidad_Cuotas:3, Cuota_Mensual:190000, Total_Final:570000, Liberados:"A consultar", Seguro:"A consultar", Descuentos:"A consultar", Actividades:"Tirolesa, Metegol Humano, Arco y Flecha, Desafío Ninja, Palestra/Muro Escalar, Circuito Aéreo, Fiesta Espuma, Piletas, Toboganes, Tirolesa en agua, Stand-up, Kayak, Fogón, Fiesta Matiné Robot Led, Noche en Dormis", Vigencia:"Promoción válida hasta el 30 de abril de 2026" },
  { Empresa:"Puerto Aventura", Destino:"Chascomús", Transporte:"Bus", Dias:3, Noches:2, Plan_Pago:"Plan en 8 cuotas", Cantidad_Cuotas:8, Cuota_Mensual:85000, Total_Final:680000, Liberados:"A consultar", Seguro:"A consultar", Descuentos:"A consultar", Actividades:"Actividades Aventura, Acuáticas, Lacustres, Fiestas", Vigencia:"Promoción válida hasta el 30 de abril de 2026" },
  { Empresa:"Recrear", Destino:"Carlos Paz / Córdoba", Transporte:"Avión", Dias:3, Noches:2, Plan_Pago:"Plan en 18 cuotas", Cantidad_Cuotas:18, Reserva:100000, Inscripcion:100000, Cuota_Mensual:59000, Total_Final:800000, Liberados:"1 cada 5 chicos (flexible)", Seguro:"Seguro de Caución + Cobertura Hospital Italiano", Descuentos:"20% de descuento para familias que ya viajaron con Recrear", Actividades:"Complejos acuáticos, Paintball, Día de Campo, Parque Aéreo, Aventura, Fiestas temáticas nocturnas (Flúor, Disfraces, Recrear Fest, Noche Argentina)", Vigencia:"Cuota inicial $100.000 más cuota 1 de $100.000, luego cuotas fijas sin interés" },
  { Empresa:"Recrear", Destino:"Carlos Paz / Córdoba", Transporte:"Avión", Dias:4, Noches:3, Plan_Pago:"Plan en 18 cuotas", Cantidad_Cuotas:18, Reserva:100000, Inscripcion:100000, Cuota_Mensual:78000, Total_Final:1000000, Liberados:"1 cada 5 chicos (flexible)", Seguro:"Seguro de Caución + Cobertura Hospital Italiano", Descuentos:"20% de descuento para familias que ya viajaron con Recrear", Actividades:"Complejos acuáticos, Paintball, Día de Campo, Parque Aéreo, Aventura, Fiestas temáticas nocturnas", Vigencia:"Cuota inicial $100.000 más cuota 1 de $100.000, luego cuotas fijas sin interés" },
  { Empresa:"Recrear", Destino:"Carlos Paz / Córdoba", Transporte:"Avión", Dias:5, Noches:4, Plan_Pago:"Plan en 18 cuotas", Cantidad_Cuotas:18, Reserva:100000, Inscripcion:100000, Cuota_Mensual:93000, Total_Final:1260000, Liberados:"1 cada 5 chicos (flexible)", Seguro:"Seguro de Caución + Cobertura Hospital Italiano", Descuentos:"20% de descuento para familias que ya viajaron con Recrear", Actividades:"Complejos acuáticos, Paintball, Día de Campo, Parque Aéreo, Aventura, Fiestas temáticas nocturnas", Vigencia:"Cuota inicial $100.000 más cuota 1 de $100.000, luego cuotas fijas sin interés" },
  { Empresa:"Recrear", Destino:"Córdoba", Transporte:"Avión", Dias:5, Noches:4, Plan_Pago:"Plan en 12 cuotas", Cantidad_Cuotas:12, Reserva:100000, Inscripcion:100000, Cuota_Mensual:119000, Total_Final:1010000, Liberados:"1 cada 5 chicos (flexible)", Seguro:"Seguro de Caución + Cobertura Hospital Italiano", Descuentos:"20% de descuento para familias que ya viajaron con Recrear", Actividades:"Complejos acuáticos, Paintball, Día de Campo, Parque Aéreo, Aventura, Fiestas temáticas nocturnas", Vigencia:"$250.000 menos que Carlos Paz. Precio si se decide rápido" },
  { Empresa:"Recrear", Destino:"Carlos Paz / Córdoba (en Bus)", Transporte:"Bus", Dias:3, Noches:2, Plan_Pago:"Plan en 18 cuotas", Cantidad_Cuotas:18, Reserva:100000, Inscripcion:100000, Cuota_Mensual:87000, Liberados:"1 cada 5 chicos (flexible)", Seguro:"Seguro de Caución + Cobertura Hospital Italiano", Descuentos:"20% de descuento para familias que ya viajaron con Recrear", Actividades:"Complejos acuáticos, Paintball, Día de Campo, Parque Aéreo, Aventura, Fiestas temáticas nocturnas", Vigencia:"Micro Plusmar 5 estrellas modelo 2025/2026/2027 desde la puerta del colegio. Precio similar al avión (aproximadamente $87.000 por mes)" },
  { Empresa:"Recrear", Destino:"Carlos Paz / Córdoba (en Bus)", Transporte:"Bus", Dias:4, Noches:3, Plan_Pago:"Plan en 18 cuotas", Cantidad_Cuotas:18, Reserva:100000, Inscripcion:100000, Cuota_Mensual:87000, Liberados:"1 cada 5 chicos (flexible)", Seguro:"Seguro de Caución + Cobertura Hospital Italiano", Descuentos:"20% de descuento para familias que ya viajaron con Recrear", Actividades:"Complejos acuáticos, Paintball, Día de Campo, Parque Aéreo, Aventura, Fiestas temáticas nocturnas", Vigencia:"Micro Plusmar 5 estrellas modelo 2025/2026/2027 desde la puerta del colegio. Precio similar al avión (aproximadamente $87.000 por mes)" },
  { Empresa:"Recrear", Destino:"Carlos Paz / Córdoba (en Bus)", Transporte:"Bus", Dias:5, Noches:4, Plan_Pago:"Plan en 18 cuotas", Cantidad_Cuotas:18, Reserva:100000, Inscripcion:100000, Cuota_Mensual:87000, Liberados:"1 cada 5 chicos (flexible)", Seguro:"Seguro de Caución + Cobertura Hospital Italiano", Descuentos:"20% de descuento para familias que ya viajaron con Recrear", Actividades:"Complejos acuáticos, Paintball, Día de Campo, Parque Aéreo, Aventura, Fiestas temáticas nocturnas", Vigencia:"Micro Plusmar 5 estrellas modelo 2025/2026/2027 desde la puerta del colegio. Precio similar al avión (aproximadamente $87.000 por mes)" },
  { Empresa:"Recrear", Destino:"Federación", Transporte:"Bus", Dias:3, Noches:2, Plan_Pago:"Plan en 18 cuotas", Cantidad_Cuotas:18, Reserva:100000, Inscripcion:100000, Cuota_Mensual:46000, Total_Final:620000, Liberados:"1 cada 5 chicos (flexible)", Seguro:"Seguro de Caución + Cobertura Hospital Italiano", Descuentos:"20% de descuento para familias que ya viajaron con Recrear", Actividades:"Complejos termales y acuáticos, Reserva Natural, Día de Campo, Fiestas temáticas nocturnas", Vigencia:"Paraíso Termal. 5 horas en micro" },
  { Empresa:"Recrear", Destino:"Federación", Transporte:"Bus", Dias:4, Noches:3, Plan_Pago:"Plan en 18 cuotas", Cantidad_Cuotas:18, Reserva:100000, Inscripcion:100000, Cuota_Mensual:60000, Total_Final:810000, Liberados:"1 cada 5 chicos (flexible)", Seguro:"Seguro de Caución + Cobertura Hospital Italiano", Descuentos:"20% de descuento para familias que ya viajaron con Recrear", Actividades:"Complejos termales y acuáticos, Reserva Natural, Día de Campo, Fiestas temáticas nocturnas", Vigencia:"Paraíso Termal. 5 horas en micro" },
];

// === HELPERS ===
const fmt = (n) => {
  if (n == null || n === "" || isNaN(n)) return "—";
  return "$ " + Number(n).toLocaleString("es-AR");
};

const COMPANY_ACCENT = {
  "Flecha":          { bg: "bg-amber-50",    border: "border-amber-300",    text: "text-amber-900",   dot: "bg-amber-500",   ring: "ring-amber-200",   chip: "bg-amber-100" },
  "Super Tour":      { bg: "bg-rose-50",     border: "border-rose-300",     text: "text-rose-900",    dot: "bg-rose-500",    ring: "ring-rose-200",    chip: "bg-rose-100" },
  "Recrear":         { bg: "bg-emerald-50",  border: "border-emerald-300",  text: "text-emerald-900", dot: "bg-emerald-500", ring: "ring-emerald-200", chip: "bg-emerald-100" },
  "Lake Travel":     { bg: "bg-sky-50",      border: "border-sky-300",      text: "text-sky-900",     dot: "bg-sky-500",     ring: "ring-sky-200",     chip: "bg-sky-100" },
  "Serrano":         { bg: "bg-violet-50",   border: "border-violet-300",   text: "text-violet-900",  dot: "bg-violet-500",  ring: "ring-violet-200",  chip: "bg-violet-100" },
  "Puerto Aventura": { bg: "bg-teal-50",     border: "border-teal-300",     text: "text-teal-900",    dot: "bg-teal-500",    ring: "ring-teal-200",    chip: "bg-teal-100" },
};

function getPaymentTip(plan) {
  const c = plan.Cantidad_Cuotas;
  if (c === 1) return "Pagás todo el viaje de una sola vez. Suele tener el precio más bajo y a veces ofrece descuentos.";
  if (c === null) return "Es un plan flexible. La empresa coordina los pagos directamente con el grupo.";
  if (c <= 5) return `Pagás en ${c} cuotas. Es un plan corto: cada pago es más alto, pero el precio total es menor que en planes largos.`;
  if (c <= 12) return `Pagás en ${c} cuotas mensuales. Es un plan intermedio: equilibra el monto mensual con el total final.`;
  return `Pagás en ${c} cuotas mensuales. Es un plan extendido: la cuota mensual es baja, pero el total final es más alto.`;
}

// === HELP TIP ===
function HelpTip({ children }) {
  return (
    <div className="flex gap-2 bg-sky-50 border border-sky-200 rounded-lg px-3.5 py-2.5">
      <Lightbulb className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" strokeWidth={2.2} />
      <p className="text-[12.5px] text-sky-900 leading-snug">{children}</p>
    </div>
  );
}

// === GUIDE BANNER ===
function GuideBanner() {
  const [open, setOpen] = useState(false);
  const items = [
    { title: "Pago de Contado", desc: "Pagás el viaje completo en uno o muy pocos pagos al principio. Es la opción más barata: muchas empresas ofrecen un descuento por elegirla." },
    { title: "Cuotas mensuales", desc: "Es un plan donde dividís el total en pagos mensuales iguales. A más cuotas, menor es el monto que pagás cada mes, pero el precio total final aumenta." },
    { title: "Inscripción", desc: "Es el primer pago que hacés al firmar el contrato. Sirve para reservar tu lugar en el viaje y forma parte del precio total." },
    { title: "Reserva", desc: "Un adelanto pequeño que se entrega al apuntarse. En algunas empresas se suma a la inscripción." },
    { title: "Anticipo o Saldo", desc: "Es un pago grande que se hace antes del viaje, además de las cuotas. Cubre los gastos previos al inicio del viaje." },
    { title: "Liberados", desc: "Pasajeros que viajan sin pagar. Suelen ser acompañantes adultos o premios cuando el grupo llega a cierto número de participantes." },
    { title: "Seguro de Caución", desc: "Es una garantía: si la empresa no cumple con el viaje, te devuelven el dinero pagado." },
  ];

  return (
    <div className="bg-white border border-sky-200 rounded-2xl overflow-hidden mb-8 shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-sky-50/60 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-sky-700" strokeWidth={2} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-sky-700 font-bold">Guía rápida</p>
            <h3 className="font-serif text-xl text-stone-900 leading-tight">¿Cómo leer esta comparativa?</h3>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-sm text-sky-700 font-semibold">
          {open ? "Ocultar" : "Ver guía"}
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 grid grid-cols-1 md:grid-cols-2 gap-3 animate-[fadeIn_0.25s_ease-out]">
          {items.map((item, i) => (
            <div key={i} className="flex gap-3 p-3 bg-sky-50/70 border border-sky-100 rounded-xl">
              <Lightbulb className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" strokeWidth={2} />
              <div>
                <p className="font-semibold text-sky-950 text-sm mb-0.5">{item.title}</p>
                <p className="text-[13px] text-sky-900/80 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// === DESTINATION CARD ===
function DestinationCard({ empresa, destino, planes }) {
  const accent = COMPANY_ACCENT[empresa] || COMPANY_ACCENT["Flecha"];
  const TransIcon = planes[0].Transporte === "Avión" ? Plane : Bus;

  const durations = useMemo(() => {
    const set = new Set();
    planes.forEach(p => { if (p.Dias && p.Noches) set.add(`${p.Dias}|${p.Noches}`); });
    return Array.from(set).map(d => {
      const [dias, noches] = d.split("|");
      return { dias: Number(dias), noches: Number(noches), key: d };
    }).sort((a, b) => a.dias - b.dias);
  }, [planes]);

  const hasDurations = durations.length > 0;
  const [selectedDuration, setSelectedDuration] = useState(hasDurations ? durations[0].key : null);
  const [showActivities, setShowActivities] = useState(false);
  const [showConditions, setShowConditions] = useState(false);

  const availablePlans = useMemo(() => {
    if (!hasDurations) return planes;
    const [dias, noches] = selectedDuration.split("|").map(Number);
    return planes.filter(p => p.Dias === dias && p.Noches === noches);
  }, [planes, selectedDuration, hasDurations]);

  const [selectedPlanIdx, setSelectedPlanIdx] = useState(0);
  useEffect(() => { setSelectedPlanIdx(0); }, [selectedDuration]);

  const plan = availablePlans[selectedPlanIdx] || availablePlans[0];
  if (!plan) return null;

  const totals = availablePlans.map(p => p.Total_Final).filter(v => v != null && !isNaN(v));
  const minTotal = totals.length ? Math.min(...totals) : null;
  const isCheapest = plan.Total_Final === minTotal && totals.length > 1;

  const acts = (plan.Actividades || "").split(",").map(s => s.trim()).filter(Boolean);

  // Cálculos para la Calculadora de Pagos
  const reserva = plan.Reserva || 0;
  const inscripcion = plan.Inscripcion || 0;
  const primeraCuota = plan.Primera_Cuota || 0;
  // Cuando Primera_Cuota tiene un valor distinto de Cuota_Mensual significa que es un pago especial al firmar
  const hasPrimeraCuotaDistinta = primeraCuota > 0 && plan.Cuota_Mensual && primeraCuota !== plan.Cuota_Mensual;
  const upfront = inscripcion + reserva + (hasPrimeraCuotaDistinta ? primeraCuota : 0);
  // Lógica de cuotas mensuales restantes según la estructura del plan:
  // - Si hay Inscripción + Primera Cuota distinta (caso Flecha): la inscripción y la primera cuota
  //   ya cuentan dentro de las "N cuotas" del plan, entonces quedan N-2 cuotas mensuales.
  // - Si solo hay Primera Cuota distinta (sin Inscripción): la primera cuota cuenta dentro de N → N-1 mensuales.
  // - Si solo hay Inscripción (caso Super Tour, Recrear, Lake): las cuotas son N completas.
  let cuotasRestantes = plan.Cantidad_Cuotas || 0;
  if (hasPrimeraCuotaDistinta) {
    cuotasRestantes -= 1;
    if (inscripcion > 0) cuotasRestantes -= 1;
  }
  cuotasRestantes = Math.max(0, cuotasRestantes);
  const hasMonthlyPayments = cuotasRestantes > 0 && plan.Cuota_Mensual && plan.Cantidad_Cuotas > 1;
  const hasAnticipo = plan.Anticipo_Saldo && plan.Anticipo_Saldo > 0;

  let stepCounter = 0;
  const nextStep = () => ++stepCounter;

  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden hover:shadow-xl hover:border-stone-300 transition-all duration-300 flex flex-col">

      {/* HEADER */}
      <div className={`${accent.bg} ${accent.border} border-b px-6 pt-5 pb-5`}>
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-2 h-2 rounded-full ${accent.dot}`} />
          <p className={`text-[11px] uppercase tracking-[0.22em] font-bold ${accent.text}`}>{empresa}</p>
        </div>
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-serif text-3xl text-stone-900 leading-tight tracking-tight flex items-start gap-2">
            <MapPin className="w-6 h-6 text-stone-700 mt-1 shrink-0" strokeWidth={1.8} />
            <span>{destino}</span>
          </h3>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur rounded-lg border border-stone-200">
            <TransIcon className="w-4 h-4 text-stone-700" strokeWidth={2} />
            <span className="text-sm font-semibold text-stone-700">{plan.Transporte}</span>
          </div>
        </div>
      </div>

      <div className="px-6 pt-5 pb-2 space-y-4">

        {/* SELECTOR DURACIÓN */}
        {hasDurations && durations.length > 1 && (
          <div>
            <label className="text-xs font-bold text-stone-700 mb-2 flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5" />
              Cantidad de días del viaje
            </label>
            <div className="flex flex-wrap gap-1.5">
              {durations.map(d => {
                const isActive = d.key === selectedDuration;
                return (
                  <button
                    key={d.key}
                    onClick={() => setSelectedDuration(d.key)}
                    className={`px-3.5 py-2 text-sm font-semibold rounded-lg transition-all ${
                      isActive
                        ? `${accent.bg} ${accent.text} ring-2 ${accent.ring} shadow-sm`
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    {d.dias} días · {d.noches} {d.noches === 1 ? "noche" : "noches"}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* SELECTOR DE FORMA DE PAGO */}
        {availablePlans.length > 0 && (
          <div>
            <label className="text-xs font-bold text-stone-700 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Forma de pago</span>
              <span className="text-stone-400 font-normal">
                {availablePlans.length} {availablePlans.length === 1 ? "opción disponible" : "opciones disponibles"}
              </span>
            </label>
            <div className="relative">
              <select
                value={selectedPlanIdx}
                onChange={(e) => setSelectedPlanIdx(Number(e.target.value))}
                disabled={availablePlans.length <= 1}
                className="w-full appearance-none bg-white border-2 border-stone-300 rounded-xl pl-4 pr-10 py-3 text-[15px] font-semibold text-stone-900 focus:outline-none focus:border-stone-700 hover:border-stone-400 transition-colors disabled:opacity-70 disabled:cursor-default cursor-pointer"
              >
                {availablePlans.map((p, i) => (
                  <option key={i} value={i}>
                    {p.Plan_Pago}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-5 h-5 text-stone-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}

        <HelpTip>{getPaymentTip(plan)}</HelpTip>
      </div>

      {/* CALCULADORA DE PAGOS */}
      <div className="mx-6 mt-4 mb-2">
        <div className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-2xl p-5 text-white relative overflow-hidden">
          {isCheapest && (
            <span className="absolute top-3 right-3 px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase rounded-full bg-emerald-500 text-white flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> El más económico
            </span>
          )}

          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-4 h-4 text-stone-300" strokeWidth={2.2} />
            <p className="text-[10px] uppercase tracking-[0.22em] text-stone-300 font-bold">Calculadora de Pagos</p>
          </div>

          <div className="space-y-3 mb-4">

            {upfront > 0 && (
              <div className="flex items-start gap-3 pb-3 border-b border-white/10">
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">{nextStep()}</div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">Dinero que se paga al firmar</p>
                  <p className="font-serif text-2xl font-semibold leading-none mt-0.5">{fmt(upfront)}</p>
                  <div className="text-[11px] text-stone-400 mt-1.5 space-y-0.5">
                    {inscripcion > 0 && <p>Inscripción: {fmt(inscripcion)}</p>}
                    {reserva > 0 && <p>Reserva: {fmt(reserva)}</p>}
                    {hasPrimeraCuotaDistinta && <p>Primera cuota: {fmt(primeraCuota)}</p>}
                  </div>
                </div>
              </div>
            )}

            {hasAnticipo && (
              <div className="flex items-start gap-3 pb-3 border-b border-white/10">
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">{nextStep()}</div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">Anticipo antes del viaje</p>
                  <p className="font-serif text-2xl font-semibold leading-none mt-0.5">{fmt(plan.Anticipo_Saldo)}</p>
                  <p className="text-[11px] text-stone-400 mt-1">Pago grande adicional, fuera de las cuotas</p>
                </div>
              </div>
            )}

            {hasMonthlyPayments && (
              <div className="flex items-start gap-3 pb-3 border-b border-white/10">
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">{nextStep()}</div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">
                    {hasPrimeraCuotaDistinta ? "Cuotas mensuales restantes" : "Cuotas mensuales"}
                  </p>
                  <p className="font-serif text-2xl font-semibold leading-none mt-0.5">
                    {cuotasRestantes} <span className="text-sm font-normal text-stone-300">×</span> {fmt(plan.Cuota_Mensual)}
                  </p>
                  <p className="text-[11px] text-stone-400 mt-1">
                    {hasPrimeraCuotaDistinta
                      ? `Después de la primera cuota, pagás ${cuotasRestantes} meses más el mismo monto`
                      : "Pagás todos los meses el mismo monto"}
                  </p>
                </div>
              </div>
            )}

            {!hasMonthlyPayments && plan.Cantidad_Cuotas === 1 && upfront === 0 && !hasAnticipo && (
              <div className="flex items-start gap-3 pb-3 border-b border-white/10">
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">1</div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">Pago único</p>
                  <p className="font-serif text-2xl font-semibold leading-none mt-0.5">Todo en un solo pago</p>
                </div>
              </div>
            )}

            {plan.Cantidad_Cuotas == null && (
              <div className="flex items-start gap-3 pb-3 border-b border-white/10">
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">·</div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">Plan a coordinar</p>
                  <p className="text-[13px] text-stone-200 mt-0.5">Las condiciones de pago se acuerdan directamente con la empresa</p>
                </div>
              </div>
            )}

          </div>

          {/* TOTAL */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-stone-300 font-bold">Total final del viaje</p>
                <p className="text-[11px] text-stone-400 mt-0.5">Suma de todos los pagos</p>
              </div>
              <p className="font-serif text-4xl font-bold leading-none">{fmt(plan.Total_Final)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* DATOS DEL VIAJE */}
      <div className="px-6 pt-2 pb-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          {plan.Dias && (
            <div className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2.5 flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-stone-500 shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">Días</p>
                <p className="font-semibold text-stone-800 text-[13px]">{plan.Dias} días</p>
              </div>
            </div>
          )}
          {plan.Noches && (
            <div className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2.5 flex items-center gap-2">
              <Bed className="w-4 h-4 text-stone-500 shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">Noches</p>
                <p className="font-semibold text-stone-800 text-[13px]">{plan.Noches} {plan.Noches === 1 ? "noche" : "noches"}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ACTIVIDADES */}
      {acts.length > 0 && (
        <div className="px-6 border-t border-stone-200">
          <button
            onClick={() => setShowActivities(!showActivities)}
            className="w-full flex items-center justify-between py-3.5 text-sm font-semibold text-stone-700 hover:text-stone-900 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Actividades incluidas
              <span className={`${accent.chip} ${accent.text} text-[10px] font-bold px-2 py-0.5 rounded-full`}>{acts.length}</span>
            </span>
            {showActivities ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showActivities && (
            <div className="pb-4 animate-[fadeIn_0.2s_ease-out]">
              <div className="flex flex-wrap gap-1.5">
                {acts.map((a, i) => (
                  <span key={i} className={`inline-block px-2.5 py-1 ${accent.bg} border ${accent.border} rounded-md text-[12px] ${accent.text}`}>{a}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONDICIONES */}
      <div className="px-6 border-t border-stone-200">
        <button
          onClick={() => setShowConditions(!showConditions)}
          className="w-full flex items-center justify-between py-3.5 text-sm font-semibold text-stone-700 hover:text-stone-900 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            Condiciones, descuentos y vigencia
          </span>
          {showConditions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showConditions && (
          <div className="pb-4 space-y-3 animate-[fadeIn_0.2s_ease-out]">
            {plan.Liberados && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-stone-500 font-bold mb-1 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Pasajeros liberados</p>
                <p className="text-[13px] text-stone-700 leading-relaxed">{plan.Liberados}</p>
              </div>
            )}
            {plan.Seguro && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-stone-500 font-bold mb-1 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Seguro</p>
                <p className="text-[13px] text-stone-700 leading-relaxed">{plan.Seguro}</p>
              </div>
            )}
            {plan.Descuentos && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-stone-500 font-bold mb-1 flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Descuentos disponibles</p>
                <p className="text-[13px] text-stone-700 leading-relaxed">{plan.Descuentos}</p>
              </div>
            )}
            {plan.Vigencia && plan.Vigencia !== "-" && (
              <div className="pt-2 border-t border-stone-100">
                <p className="text-[10px] uppercase tracking-wider text-stone-500 font-bold mb-1">Vigencia y notas</p>
                <p className="text-[13px] text-stone-600 italic leading-relaxed">{plan.Vigencia}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// === MAIN ===
export default function App() {

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Albert+Sans:wght@400;500;600;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    const style = document.createElement("style");
    style.textContent = `
      .font-serif { font-family: 'Fraunces', Georgia, serif; }
      body, .font-sans { font-family: 'Albert Sans', system-ui, sans-serif; }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(style);
  }, []);

  const groupedDestinations = useMemo(() => {
    const groups = {};
    RAW.forEach(r => {
      const key = `${r.Empresa}|||${r.Destino}`;
      if (!groups[key]) groups[key] = { empresa: r.Empresa, destino: r.Destino, planes: [] };
      groups[key].planes.push(r);
    });

    let arr = Object.values(groups);
    arr.sort((a, b) => a.empresa.localeCompare(b.empresa) || a.destino.localeCompare(b.destino));
    return arr;
  }, []);

  const stats = useMemo(() => ({
    empresas: new Set(groupedDestinations.map(g => g.empresa)).size,
    destinos: groupedDestinations.length,
    planes: groupedDestinations.reduce((acc, g) => acc + g.planes.length, 0),
  }), [groupedDestinations]);

  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      <div className="h-1.5 bg-gradient-to-r from-amber-400 via-rose-400 via-emerald-400 via-sky-400 via-violet-400 to-teal-400" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

        {/* HEADER */}
        <div className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.25em] text-stone-500 font-bold mb-2">Comparativa 2026</p>
          <h1 className="font-serif text-4xl sm:text-5xl text-stone-900 tracking-tight leading-none mb-4">
            Viajes de <em className="text-stone-700">egresados</em>
          </h1>
          <p className="text-stone-600 max-w-2xl text-base leading-relaxed">
            Una tarjeta por empresa y destino. Elegí los días del viaje y la forma de pago para que la calculadora te muestre exactamente cuánto pagás y cuándo.
          </p>
        </div>

        <GuideBanner />

        {/* ESTADÍSTICAS */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white border border-stone-200 rounded-xl px-4 py-3.5">
            <p className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">Empresas</p>
            <p className="font-serif text-3xl text-stone-900 leading-none mt-1">{stats.empresas}</p>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl px-4 py-3.5">
            <p className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">Destinos</p>
            <p className="font-serif text-3xl text-stone-900 leading-none mt-1">{stats.destinos}</p>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl px-4 py-3.5">
            <p className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">Planes de pago</p>
            <p className="font-serif text-3xl text-stone-900 leading-none mt-1">{stats.planes}</p>
          </div>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {groupedDestinations.map(g => (
            <DestinationCard
              key={`${g.empresa}-${g.destino}`}
              empresa={g.empresa}
              destino={g.destino}
              planes={g.planes}
            />
          ))}
        </div>

        <footer className="mt-16 pt-8 border-t border-stone-200 text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400 font-semibold">
            Datos de comparativa · Buenos Aires · 2026
          </p>
        </footer>
      </div>
    </div>
  );
}
