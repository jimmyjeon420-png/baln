/**
 * 개인정보처리방침 화면 - Zero-Knowledge 정책
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { HeaderBar } from '../../src/components/common/HeaderBar';

export default function PrivacyScreen() {
  const { colors } = useTheme();

  const privacyPolicies = [
    {
      icon: 'shield-checkmark',
      title: 'Zero-Knowledge 원칙',
      description:
        '당사는 귀하의 실제 자산 정보, 거래 비밀번호, 증권사 로그인 정보를 수집하거나 저장하지 않습니다. 앱은 스크린샷 이미지만 분석하며, 원본 이미지는 처리 후 즉시 삭제됩니다.',
    },
    {
      icon: 'lock-closed',
      title: '데이터 암호화',
      description:
        '모든 데이터는 전송 중 TLS 1.3으로 암호화되며, 저장 시 AES-256 암호화를 적용합니다. 암호화 키는 사용자 기기에서만 생성되고 관리됩니다.',
    },
    {
      icon: 'cloud-offline',
      title: '로컬 우선 처리',
      description:
        '가능한 한 모든 계산과 분석은 기기 내에서 수행됩니다. AI 분석이 필요한 경우에만 익명화된 데이터가 서버로 전송됩니다.',
    },
    {
      icon: 'eye-off',
      title: '익명화 처리',
      description:
        'AI 분석을 위해 전송되는 데이터는 개인 식별 정보가 모두 제거됩니다. 티커 심볼과 수량만 사용하며, 계좌번호나 실명은 전송되지 않습니다.',
    },
    {
      icon: 'trash',
      title: '데이터 삭제 권리',
      description:
        '언제든지 모든 데이터를 삭제할 수 있습니다. 설정 > 보안 > 계정 삭제에서 모든 데이터를 영구적으로 삭제할 수 있습니다. 삭제된 데이터는 복구할 수 없습니다.',
    },
    {
      icon: 'hand-left',
      title: '제3자 공유 금지',
      description:
        '귀하의 데이터는 광고, 마케팅, 또는 어떤 제3자 목적으로도 판매되거나 공유되지 않습니다. 법적 요구가 있는 경우에도 암호화된 데이터만 존재하므로 실질적인 정보 제공이 불가능합니다.',
    },
  ];

  const dataCollected = [
    { item: '이메일 주소', purpose: '계정 생성 및 로그인', retention: '계정 삭제 시까지' },
    { item: '포트폴리오 데이터', purpose: '자산 관리 및 AI 분석', retention: '사용자 삭제 가능' },
    { item: 'AI 분석 로그', purpose: '서비스 품질 향상', retention: '30일 후 자동 삭제' },
    { item: '앱 사용 통계', purpose: '서비스 개선', retention: '익명화 후 저장' },
    { item: '결제 정보', purpose: '크레딧 구매 처리', retention: '결제대행사 보관 (5년)' },
    { item: '커뮤니티 게시물', purpose: 'VIP 라운지 서비스', retention: '사용자 삭제 가능' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar title="개인정보처리방침" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Zero-Knowledge 배너 */}
        <View style={[styles.zeroBanner, { backgroundColor: `${colors.primary}20` }]}>
          <Ionicons name="shield" size={40} color={colors.primary} />
          <View style={styles.zeroBannerText}>
            <Text style={[styles.zeroBannerTitle, { color: colors.primary }]}>Zero-Knowledge 정책</Text>
            <Text style={[styles.zeroBannerSubtitle, { color: colors.textSecondary }]}>
              당사는 귀하의 비밀을 알지 못합니다
            </Text>
          </View>
        </View>

        {/* 정책 목록 */}
        <View style={styles.policiesContainer}>
          {privacyPolicies.map((policy, index) => (
            <View key={index} style={[styles.policyItem, { backgroundColor: colors.surface }]}>
              <View style={[styles.policyIconContainer, { backgroundColor: colors.surfaceElevated }]}>
                <Ionicons
                  name={policy.icon as any}
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={styles.policyContent}>
                <Text style={[styles.policyTitle, { color: colors.textPrimary }]}>{policy.title}</Text>
                <Text style={[styles.policyDescription, { color: colors.textSecondary }]}>{policy.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* 개인정보의 처리 목적 */}
        <View style={[styles.tableContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.tableTitle, { color: colors.textPrimary }]}>개인정보의 처리 목적</Text>
          <Text style={[styles.aiDecisionText, { color: colors.textSecondary }]}>
            회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 「개인정보 보호법」 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.{'\n\n'}
            1. 회원 가입 및 관리: 회원 가입 의사 확인, 본인 식별·인증, 회원자격 유지·관리, 서비스 부정이용 방지{'\n'}
            2. 서비스 제공: 포트폴리오 관리, AI 기반 자산 분석, 리밸런싱 추천, 맥락 카드 제공, 예측 게임 운영{'\n'}
            3. 마케팅 및 광고 활용: 이벤트 및 광고성 정보 제공 (동의 시), 서비스 이용 통계 및 접속빈도 파악{'\n'}
            4. 민원 처리: 민원인의 신원 확인, 민원사항 확인, 사실 조사를 위한 연락·통지, 처리결과 통보
          </Text>
        </View>

        {/* 수집 데이터 테이블 */}
        <View style={[styles.tableContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.tableTitle, { color: colors.textPrimary }]}>수집 데이터 현황</Text>
          <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.tableHeaderText, { flex: 2, color: colors.primary }]}>항목</Text>
            <Text style={[styles.tableHeaderText, { flex: 2, color: colors.primary }]}>목적</Text>
            <Text style={[styles.tableHeaderText, { flex: 2, color: colors.primary }]}>보관 기간</Text>
          </View>
          {dataCollected.map((data, index) => (
            <View key={index} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.tableCell, { flex: 2, color: colors.textSecondary }]}>{data.item}</Text>
              <Text style={[styles.tableCell, { flex: 2, color: colors.textSecondary }]}>{data.purpose}</Text>
              <Text style={[styles.tableCell, { flex: 2, color: colors.textSecondary }]}>{data.retention}</Text>
            </View>
          ))}
        </View>

        {/* AI 자동화 의사결정 */}
        <View style={[styles.tableContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.tableTitle, { color: colors.textPrimary }]}>AI 자동화 의사결정 및 프로파일링</Text>
          <Text style={[styles.aiDecisionText, { color: colors.textSecondary }]}>
            당사는 포트폴리오 데이터를 기반으로 AI 자동 분석(리스크 평가, 리밸런싱 제안, 세금 계산, 투자 거장 인사이트 등)을 수행합니다.{'\n\n'}
            「개인정보 보호법」 제37조의2에 따라, 귀하는 완전히 자동화된 의사결정에 대해 설명을 요구하거나 거부할 권리가 있습니다.{'\n\n'}
            • AI 분석 거부: 설정 {'>'} 보안 {'>'} AI 자동 분석 비활성화{'\n'}
            • AI 의사결정 설명 요구: baln.logic@gmail.com으로 문의{'\n\n'}
            AI 분석은 투자 결정을 자동으로 실행하지 않으며, 최종 판단은 항상 이용자 본인이 직접 수행합니다.
          </Text>
        </View>

        {/* 개인정보의 국외 이전 */}
        <View style={[styles.tableContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.tableTitle, { color: colors.textPrimary }]}>개인정보의 국외 이전</Text>
          <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.tableHeaderText, { flex: 2, color: colors.primary }]}>이전받는 자</Text>
            <Text style={[styles.tableHeaderText, { flex: 2, color: colors.primary }]}>목적</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, color: colors.primary }]}>국가</Text>
          </View>
          <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.tableCell, { flex: 2, color: colors.textSecondary }]}>Supabase Inc.{'\n'}(AWS 인프라)</Text>
            <Text style={[styles.tableCell, { flex: 2, color: colors.textSecondary }]}>데이터베이스{'\n'}호스팅</Text>
            <Text style={[styles.tableCell, { flex: 1, color: colors.textSecondary }]}>미국</Text>
          </View>
          <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.tableCell, { flex: 2, color: colors.textSecondary }]}>Google LLC{'\n'}(Gemini 3 Flash)</Text>
            <Text style={[styles.tableCell, { flex: 2, color: colors.textSecondary }]}>AI 분석{'\n'}처리</Text>
            <Text style={[styles.tableCell, { flex: 1, color: colors.textSecondary }]}>미국</Text>
          </View>
          <Text style={[styles.aiDecisionText, { color: colors.textSecondary }]}>
            {'\n'}이전되는 데이터는 익명화 처리되며, 개인 식별 정보(이름, 계좌번호 등)는 포함되지 않습니다. 각 수탁업체는 GDPR 및 SOC 2 Type II 인증을 보유하고 있습니다.
          </Text>
        </View>

        {/* 정보주체의 권리 */}
        <View style={[styles.tableContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.tableTitle, { color: colors.textPrimary }]}>정보주체의 권리 행사 방법</Text>
          <Text style={[styles.aiDecisionText, { color: colors.textSecondary }]}>
            「개인정보 보호법」 제35조~제37조에 따라 귀하는 다음과 같은 권리를 행사할 수 있습니다.{'\n\n'}
            1. 개인정보 열람 요구권{'\n'}
            2. 개인정보 정정·삭제 요구권{'\n'}
            3. 개인정보 처리정지 요구권{'\n'}
            4. AI 자동화 의사결정 거부권{'\n\n'}
            권리 행사 방법:{'\n'}
            • 앱 내: 설정 {'>'} 보안 {'>'} 계정 삭제 (즉시 처리){'\n'}
            • 이메일: privacy@baln.app (10영업일 이내 처리){'\n'}
            • 서면: 개인정보보호 책임자 앞 우편 발송
          </Text>
        </View>

        {/* 개인정보 보호책임자 (개인정보보호법 제31조 필수) */}
        <View style={[styles.contactContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.contactTitle, { color: colors.textPrimary }]}>개인정보 보호책임자</Text>
          <Text style={[styles.aiDecisionText, { color: colors.textSecondary }]}>
            「개인정보 보호법」 제31조에 따라 개인정보 처리에 관한 업무를 총괄해서 책임지고, 정보주체의 개인정보 관련 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
          </Text>
          <View style={{ marginTop: 12 }}>
            <Text style={[styles.contactText, { color: colors.textSecondary }]}>
              {'\u2022'} 성명: 대표이사 (추후 업데이트 예정)
            </Text>
            <Text style={[styles.contactText, { color: colors.textSecondary }]}>
              {'\u2022'} 직위: 개인정보 보호책임자 (CPO)
            </Text>
            <Text style={[styles.contactText, { color: colors.textSecondary }]}>
              {'\u2022'} 소속: 발른 주식회사
            </Text>
            <Text style={[styles.contactText, { color: colors.textSecondary }]}>
              {'\u2022'} 이메일: privacy@baln.app
            </Text>
            <Text style={[styles.contactText, { color: colors.textSecondary }]}>
              {'\u2022'} 고객센터: baln.logic@gmail.com
            </Text>
            <Text style={[styles.contactText, { color: colors.textSecondary }]}>
              {'\u2022'} 전화: 추후 업데이트 예정
            </Text>
          </View>
        </View>

        {/* 개인정보 파기 절차 및 방법 */}
        <View style={[styles.tableContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.tableTitle, { color: colors.textPrimary }]}>개인정보 파기 절차 및 방법</Text>
          <Text style={[styles.aiDecisionText, { color: colors.textSecondary }]}>
            회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.{'\n\n'}
            <Text style={{ fontWeight: '600', color: '#FFFFFF' }}>1. 파기 절차</Text>{'\n'}
            이용자가 회원가입 등을 위해 입력한 정보는 목적이 달성된 후 별도의 DB로 옮겨져(종이의 경우 별도의 서류함) 내부 방침 및 기타 관련 법령에 의한 정보보호 사유에 따라 일정 기간 저장된 후 파기됩니다. 별도 DB로 옮겨진 개인정보는 법률에 의한 경우가 아니고서는 보유되는 이외의 다른 목적으로 이용되지 않습니다.{'\n\n'}
            <Text style={{ fontWeight: '600', color: '#FFFFFF' }}>2. 파기 방법</Text>{'\n'}
            {'  '}{'\u2022'} 전자적 파일 형태: 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제합니다. 데이터베이스 레코드는 복구 불가능한 방식(논리적 삭제 후 물리적 덮어쓰기)으로 파기합니다.{'\n'}
            {'  '}{'\u2022'} 종이 문서: 분쇄기로 분쇄하거나 소각합니다.{'\n'}
            {'  '}{'\u2022'} AI 분석 로그: 생성 후 30일이 경과하면 자동으로 영구 삭제됩니다.{'\n'}
            {'  '}{'\u2022'} 백업 데이터: 원본 삭제 후 최대 30일 이내에 백업 사본에서도 파기됩니다.{'\n\n'}
            <Text style={{ fontWeight: '600', color: '#FFFFFF' }}>3. 법령에 따른 보존 항목</Text>{'\n'}
            {'  '}{'\u2022'} 계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법){'\n'}
            {'  '}{'\u2022'} 대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법){'\n'}
            {'  '}{'\u2022'} 소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법){'\n'}
            {'  '}{'\u2022'} 통신사실확인자료: 12개월 (통신비밀보호법){'\n'}
            {'  '}{'\u2022'} 로그인 기록: 3개월 (통신비밀보호법)
          </Text>
        </View>

        {/* 개인정보의 안전성 확보 조치 */}
        <View style={[styles.tableContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.tableTitle, { color: colors.textPrimary }]}>개인정보의 안전성 확보 조치</Text>
          <Text style={[styles.aiDecisionText, { color: colors.textSecondary }]}>
            회사는 「개인정보 보호법」 제29조에 따라 다음과 같이 안전성 확보에 필요한 기술적·관리적·물리적 조치를 하고 있습니다.{'\n\n'}
            <Text style={{ fontWeight: '600', color: '#FFFFFF' }}>1. 관리적 조치</Text>{'\n'}
            {'  '}{'\u2022'} 내부관리계획 수립·시행{'\n'}
            {'  '}{'\u2022'} 개인정보 취급 직원의 최소화 및 교육{'\n'}
            {'  '}{'\u2022'} 정기적 자체 감사 실시{'\n\n'}
            <Text style={{ fontWeight: '600', color: '#FFFFFF' }}>2. 기술적 조치</Text>{'\n'}
            {'  '}{'\u2022'} 개인정보의 암호화: 모든 데이터는 TLS 1.3으로 전송되며, AES-256으로 저장 시 암호화{'\n'}
            {'  '}{'\u2022'} 해킹 등에 대비한 기술적 대책: 침입 탐지 시스템 운영, 보안 프로그램 설치·갱신{'\n'}
            {'  '}{'\u2022'} 접근 통제: 개인정보 처리 시스템에 대한 접근권한 관리, 접근 기록 보관{'\n'}
            {'  '}{'\u2022'} 접속기록 보관 및 위변조 방지: 최소 1년 이상 접속기록 보관·관리{'\n\n'}
            <Text style={{ fontWeight: '600', color: '#FFFFFF' }}>3. 물리적 조치</Text>{'\n'}
            {'  '}{'\u2022'} 클라우드 기반 서비스로 물리적 서버는 Supabase Inc.(AWS 인프라)에서 관리하며, SOC 2 Type II 인증 기준을 충족합니다.
          </Text>
        </View>

        {/* 개인정보 자동 수집 장치의 설치·운영 및 거부 */}
        <View style={[styles.tableContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.tableTitle, { color: colors.textPrimary }]}>개인정보 자동 수집 장치의 설치·운영 및 거부</Text>
          <Text style={[styles.aiDecisionText, { color: colors.textSecondary }]}>
            회사는 이용자에게 개별적인 맞춤 서비스를 제공하기 위해 이용 정보를 저장하고 수시로 불러오는 기술을 사용할 수 있습니다.{'\n\n'}
            <Text style={{ fontWeight: '600', color: '#FFFFFF' }}>1. 수집 항목</Text>{'\n'}
            {'  '}{'\u2022'} 앱 사용 통계 (화면 조회, 기능 사용 빈도){'\n'}
            {'  '}{'\u2022'} 기기 정보 (OS 버전, 앱 버전){'\n'}
            {'  '}{'\u2022'} 인증 토큰 (로그인 상태 유지){'\n\n'}
            <Text style={{ fontWeight: '600', color: '#FFFFFF' }}>2. 수집 목적</Text>{'\n'}
            {'  '}{'\u2022'} 서비스 이용 분석 및 개선{'\n'}
            {'  '}{'\u2022'} 맞춤형 서비스 제공{'\n'}
            {'  '}{'\u2022'} 로그인 상태 유지{'\n\n'}
            <Text style={{ fontWeight: '600', color: '#FFFFFF' }}>3. 거부 방법</Text>{'\n'}
            {'  '}{'\u2022'} 이용자는 기기의 설정에서 앱 데이터를 삭제하거나, 앱을 재설치하여 자동 수집된 정보를 초기화할 수 있습니다.{'\n'}
            {'  '}{'\u2022'} 단, 자동 수집을 거부할 경우 로그인 유지 등 일부 서비스 이용에 제한이 있을 수 있습니다.
          </Text>
        </View>

        {/* 연락처 */}
        <View style={[styles.contactContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.contactTitle, { color: colors.textPrimary }]}>권익침해 구제방법</Text>
          <Text style={[styles.contactText, { color: colors.textSecondary }]}>
            개인정보침해 신고센터: (국번없이) 118 (privacy.kisa.or.kr)
          </Text>
          <Text style={[styles.contactText, { color: colors.textSecondary }]}>
            개인정보 분쟁조정위원회: (국번없이) 1833-6972 (kopico.go.kr)
          </Text>
          <Text style={[styles.contactText, { color: colors.textSecondary }]}>
            대검찰청 사이버수사과: (국번없이) 1301 (spo.go.kr)
          </Text>
          <Text style={[styles.contactText, { color: colors.textSecondary }]}>
            경찰청 사이버안전국: (국번없이) 182 (cyberbureau.police.go.kr)
          </Text>
        </View>

        {/* 개인정보처리방침의 변경 */}
        <View style={[styles.tableContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.tableTitle, { color: colors.textPrimary }]}>개인정보처리방침의 변경</Text>
          <Text style={[styles.aiDecisionText, { color: colors.textSecondary }]}>
            1. 이 개인정보처리방침은 2026년 2월 13일부터 적용됩니다.{'\n\n'}
            2. 이전의 개인정보처리방침은 아래에서 확인하실 수 있습니다.{'\n'}
            {'  '}{'\u2022'} 현재 최초 버전이며, 변경 이력이 없습니다.{'\n\n'}
            3. 개인정보처리방침이 변경되는 경우 변경사항을 시행일의 7일 전부터 앱 내 공지사항을 통해 고지할 것입니다. 다만, 이용자 권리의 중대한 변경이 있을 경우에는 최소 30일 전에 고지합니다.
          </Text>
        </View>

        {/* 마지막 업데이트 */}
        <Text style={[styles.lastUpdate, { color: colors.textTertiary }]}>
          마지막 업데이트: 2026년 2월 13일
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  zeroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    gap: 16,
  },
  zeroBannerText: {
    flex: 1,
  },
  zeroBannerTitle: {
    fontSize: 19,
    fontWeight: '700',
  },
  zeroBannerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  policiesContainer: {
    gap: 16,
    marginBottom: 24,
  },
  policyItem: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    gap: 14,
  },
  policyIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  policyContent: {
    flex: 1,
  },
  policyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  policyDescription: {
    fontSize: 14,
    lineHeight: 21,
  },
  tableContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  tableTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  tableHeaderText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  tableCell: {
    fontSize: 13,
  },
  contactContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  contactText: {
    fontSize: 14,
    marginBottom: 6,
  },
  aiDecisionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  lastUpdate: {
    fontSize: 13,
    textAlign: 'center',
  },
});
