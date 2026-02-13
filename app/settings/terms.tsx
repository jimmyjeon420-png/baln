/**
 * 이용약관 화면
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { HeaderBar } from '../../src/components/common/HeaderBar';

export default function TermsScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar title="이용약관" />

      <ScrollView style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>baln 서비스 이용약관</Text>
        <Text style={[styles.date, { color: colors.textTertiary }]}>최종 수정일: 2026년 2월 13일</Text>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>제1조 (목적)</Text>
          <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
            이 약관은 발른 주식회사(이하 "회사")가 제공하는 포트폴리오 관리 서비스(이하 "서비스")의 이용조건 및 절차, 회사와 회원 간의 권리, 의무, 책임사항 및 기타 필요한 사항을 규정함을 목적으로 합니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>제2조 (서비스의 내용)</Text>
          <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
            1. 포트폴리오 현황 관리 및 시각화{'\n'}
            2. AI 기반 자산 분석 및 추출{'\n'}
            3. 리밸런싱 추천 및 시뮬레이션{'\n'}
            4. 세금 최적화 계산{'\n'}
            5. 기타 포트폴리오 관련 부가 서비스
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>제3조 (면책조항 및 투자 위험 고지)</Text>
          <View style={[styles.warningBox, { borderColor: `${colors.error}4D` }]}>
            <Text style={[styles.warningText, { color: colors.error }]}>
              ⚠️ 원금 손실 위험 경고: 투자 원금의 일부 또는 전부를 잃을 수 있습니다.
            </Text>
          </View>
          <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
            1. 본 서비스는 「자본시장과 금융투자업에 관한 법률」(이하 "자본시장법") 제6조에 따른 금융투자업(투자자문업, 투자일임업, 집합투자업 등)에 해당하지 않으며, 금융위원회에 등록된 투자자문·일임 서비스가 아닙니다.{'\n\n'}
            2. 서비스에서 제공하는 모든 정보(AI 분석, 리밸런싱 제안, 세금 계산, 종목 분석 등)는 일반적인 정보 제공 목적이며, 특정 금융상품에 대한 매수·매도 권유가 아닙니다. 투자 결정에 대한 모든 책임은 이용자 본인에게 있습니다.{'\n\n'}
            3. 회사는 서비스 이용으로 인한 직접적·간접적 투자 손실에 대해 어떠한 법적 책임도 부담하지 않습니다.{'\n\n'}
            4. AI 분석 결과는 과거 데이터 및 통계적 모델에 기반하며, 미래 수익을 보장하지 않습니다. 시장 상황에 따라 분석 결과와 실제 결과가 크게 다를 수 있습니다.{'\n\n'}
            5. 본 서비스는 「예금자보호법」에 따른 예금보험 대상이 아니며, 투자 원금이 보장되지 않습니다.{'\n\n'}
            6. 세금 관련 정보는 참고용이며, 정확한 세무 처리를 위해 세무사 또는 공인 전문가와 상담하시기 바랍니다. 세법은 수시로 변경될 수 있습니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>제4조 (개인정보 보호)</Text>
          <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
            회사는 관련 법령이 정하는 바에 따라 회원의 개인정보를 보호하며, 개인정보의 보호 및 사용에 대해서는 개인정보처리방침을 따릅니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>제5조 (서비스 이용 제한)</Text>
          <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
            다음의 경우 서비스 이용이 제한될 수 있습니다:{'\n'}
            1. 타인의 정보 도용{'\n'}
            2. 서비스 운영 방해{'\n'}
            3. 법령 위반 행위{'\n'}
            4. 기타 회사가 정한 이용규칙 위반
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>제6조 (VIP 라운지 모임 서비스)</Text>
          <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
            1. VIP 라운지 모임은 회원 간의 자발적인 만남을 위한 매칭 플랫폼으로, 회사는 모임의 주최자가 아닙니다.{'\n\n'}
            2. 회사는 모임 진행 중 또는 모임으로 인해 발생하는 어떠한 사고, 분쟁, 손해에 대해서도 책임을 지지 않습니다.{'\n\n'}
            3. 모임 참가에 따른 모든 위험과 책임은 참가자 본인에게 있습니다.{'\n\n'}
            4. 모임 중 발생할 수 있는 인적·물적 피해, 개인정보 유출, 금전적 손실 등에 대해 회사는 일체의 법적 책임을 부담하지 않습니다.{'\n\n'}
            5. 회원은 모임 참가 전 충분한 주의를 기울여야 하며, 모임 호스트의 신원 확인은 회원 본인의 책임입니다.{'\n\n'}
            6. 모임 참가비에는 별도의 플랫폼 수수료(10%)가 부과되며, 결제 시 사전에 안내됩니다.{'\n\n'}
            7. 모임 취소 및 환불 정책은 각 모임의 호스트가 정한 규정을 따릅니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>제7조 (수수료 및 결제)</Text>
          <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
            1. 유료 모임 참가 시 참가비의 10%가 플랫폼 수수료로 부과됩니다.{'\n\n'}
            2. 결제는 신뢰할 수 있는 결제 대행사를 통해 처리되며, 결제 정보는 회사에 저장되지 않습니다.{'\n\n'}
            3. 환불은 모임 시작 24시간 전까지 신청 시 전액 환불이 가능하며, 이후에는 호스트의 정책에 따릅니다.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.dangerSectionHeader}>
            <Ionicons name="warning" size={18} color={colors.error} />
            <Text style={[styles.sectionTitle, styles.dangerSectionTitle, { color: colors.error }]}>제8조 (유사투자자문업 금지)</Text>
          </View>
          <View style={[styles.dangerBox, { backgroundColor: `${colors.error}15`, borderColor: `${colors.error}4D` }]}>
            <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
              1. 회원은 본 서비스를 이용하여 다음 각 호에 해당하는 행위를 하여서는 아니 됩니다.{'\n\n'}
              {'  '}가. <Text style={[styles.dangerHighlight, { color: colors.error }]}>「리딩방」 운영</Text>: 불특정 다수에게 특정 종목의 매수·매도를 지시하거나 유사투자자문 행위를 하는 것{'\n\n'}
              {'  '}나. <Text style={[styles.dangerHighlight, { color: colors.error }]}>수익 보장 표현</Text>: "원금 보장", "확정 수익률 OO%", "100% 수익" 등 투자 결과를 보장하는 표현을 사용하는 것{'\n\n'}
              {'  '}다. <Text style={[styles.dangerHighlight, { color: colors.error }]}>외부 채널 유인</Text>: 카카오톡, 텔레그램, 라인 등 외부 메신저로 회원을 유도하여 투자 권유 또는 금전을 요구하는 것{'\n\n'}
              {'  '}라. <Text style={[styles.dangerHighlight, { color: colors.error }]}>종목 추천료 수취</Text>: 유료 또는 무료를 불문하고, 투자 자문업 등록 없이 종목 추천의 대가를 수취하는 것{'\n\n'}
              2. 상기 행위는 「자본시장과 금융투자업에 관한 법률」 제7조(무인가·무등록 금융투자업) 위반에 해당하며, <Text style={[styles.dangerHighlight, { color: colors.error }]}>5년 이하의 징역 또는 2억원 이하의 벌금</Text>에 처해질 수 있습니다.{'\n\n'}
              3. 회사는 위반 행위 적발 시 다음의 조치를 즉시 시행합니다.{'\n\n'}
              {'  '}가. 해당 회원의 <Text style={[styles.dangerHighlight, { color: colors.error }]}>계정 영구 정지</Text> (복구 불가){'\n'}
              {'  '}나. 관련 데이터의 보전 및 <Text style={[styles.dangerHighlight, { color: colors.error }]}>관할 수사기관 통보</Text>{'\n'}
              {'  '}다. 피해 회원에 대한 민사상 손해배상 청구 지원{'\n\n'}
              4. 회원은 위반 행위를 목격한 경우 즉시 앱 내 신고 기능 또는 고객센터(baln.logic@gmail.com)를 통해 신고하여야 합니다.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>제9조 (크레딧 및 환불 정책)</Text>
          <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
            1. 크레딧은 서비스 내 AI 프리미엄 기능을 이용하기 위한 서비스 이용 포인트입니다.{'\n\n'}
            2. 크레딧 구매 후 미사용 크레딧에 대해 「전자상거래 등에서의 소비자보호에 관한 법률」 제17조에 따라 구매일로부터 7일 이내 청약철회가 가능합니다.{'\n\n'}
            3. 단, 이미 사용(차감)된 크레딧은 환불 대상에서 제외됩니다.{'\n\n'}
            4. 구독 보너스 크레딧 및 프로모션 크레딧은 환불 대상이 아닙니다.{'\n\n'}
            5. AI 분석 실행 중 기술적 오류로 결과를 제공하지 못한 경우, 차감된 크레딧은 자동으로 환불됩니다.{'\n\n'}
            6. 크레딧의 유효기간은 마지막 획득일로부터 1년이며, 유효기간 만료 30일 전 앱 내 알림으로 안내합니다. 유효기간이 경과한 크레딧은 자동으로 소멸됩니다.{'\n\n'}
            7. 크레딧은 현금으로 환급이 불가합니다. 크레딧은 서비스 내에서만 사용 가능하며, 현금, 상품권 등 다른 결제 수단으로 교환하거나 환급받을 수 없습니다.{'\n\n'}
            8. 크레딧은 타인에게 양도할 수 없습니다. 회원의 크레딧은 해당 회원의 계정에 귀속되며, 매매, 증여, 양도 등 어떠한 방법으로도 타인에게 이전할 수 없습니다.{'\n\n'}
            9. 환불 신청: baln.logic@gmail.com 또는 앱 내 고객센터를 통해 접수합니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>제10조 (연령 제한)</Text>
          <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
            1. 본 서비스는 만 14세 이상의 이용자만 이용할 수 있습니다. 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 및 「개인정보 보호법」에 따라 만 14세 미만 아동의 개인정보 수집은 법정대리인의 동의가 필요하며, 회사는 만 14세 미만 아동의 회원가입을 제한합니다.{'\n\n'}
            2. 회사는 회원가입 시 생년월일 확인 등의 방법으로 연령을 확인할 수 있으며, 만 14세 미만임이 확인된 경우 즉시 서비스 이용을 제한하고 관련 데이터를 삭제합니다.{'\n\n'}
            3. 만 14세 미만의 아동이 법정대리인의 동의 없이 가입한 것으로 확인되는 경우, 회사는 해당 계정을 정지 또는 삭제할 수 있으며, 이로 인한 서비스 이용 제한에 대해 회사는 책임을 지지 않습니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>제11조 (AI 자동화 의사결정 및 프로파일링)</Text>
          <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
            1. 회사는 이용자의 포트폴리오 데이터를 기반으로 AI 자동 분석(리스크 평가, 리밸런싱 제안, 세금 계산 등)을 수행합니다.{'\n\n'}
            2. 이용자는 「개인정보 보호법」 제37조의2에 따라 완전히 자동화된 의사결정에 대해 거부할 권리가 있으며, 설정 메뉴에서 AI 자동 분석 기능을 비활성화할 수 있습니다.{'\n\n'}
            3. AI 분석은 투자 결정을 자동으로 실행하지 않으며, 최종 투자 판단은 항상 이용자 본인이 직접 수행합니다.{'\n\n'}
            4. 이용자의 투자 성향, 자산 규모 등에 기반한 등급(티어) 분류가 이루어지며, 이에 따라 서비스 접근 범위가 달라질 수 있습니다.
          </Text>
        </View>

        <Text style={[styles.footer, { color: colors.textTertiary, borderTopColor: colors.border }]}>
          본 약관에 동의하지 않으실 경우 서비스 이용이 제한될 수 있습니다.{'\n'}
          본 약관은 대한민국 법률에 따라 해석되며, 관할 법원은 서울중앙지방법원으로 합니다.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  date: {
    fontSize: 13,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 22,
  },
  footer: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 40,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  // 유사투자자문 금지 조항 (위험 강조 스타일)
  dangerSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dangerSectionTitle: {
    marginBottom: 0,
  },
  dangerBox: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  dangerHighlight: {
    fontWeight: '700',
  },
  // 원금 손실 경고 박스
  warningBox: {
    backgroundColor: 'rgba(207, 102, 121, 0.15)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },
});
