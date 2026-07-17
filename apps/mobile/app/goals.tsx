import { useQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "../lib/api";

export default function Goals() {
  const goals = useQuery({ queryKey: ["goals"], queryFn: async () => { const { data, error } = await api.v1.goals.get(); if (error) throw error; return data; }, retry: false });
  return <SafeAreaView style={styles.safe}><Stack.Screen options={{ headerShown: true, title: "Goals" }} /><ScrollView contentContainerStyle={styles.page}>{goals.data?.map((goal) => <View key={goal.id} style={styles.card}><Text style={styles.risk}>{goal.risk.replace("_", " ")}</Text><Text style={styles.title}>{goal.title}</Text><Text style={styles.copy}>{goal.plan?.summary ?? goal.why}</Text></View>) ?? <Text style={styles.copy}>No goals loaded yet. Your goals will appear here after sign-in and sync.</Text>}</ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({safe:{flex:1,backgroundColor:"#F8F6F1"},page:{padding:20,gap:14},card:{backgroundColor:"#FFFCF6",borderColor:"#E7E1D7",borderWidth:1,borderRadius:15,padding:20},risk:{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:"#2F6B55",fontWeight:"700"},title:{fontFamily:"serif",fontSize:25,color:"#24231F",marginTop:15},copy:{color:"#706C64",lineHeight:21,marginTop:8}});
